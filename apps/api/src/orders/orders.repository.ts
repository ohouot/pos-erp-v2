import { Injectable } from "@nestjs/common";
import type {
  Prisma,
  PrismaClient,
  OrderStatus,
  OrderItemStatus,
} from "@prisma/client";
import {
  ORDER_STATUS_TO_PAID_GROUP,
  type OrderPaidStatusGroup,
} from "@pos-erp-v2/shared";
import { PrismaService } from "../prisma/prisma.service.js";

export type Db = Prisma.TransactionClient | PrismaClient;

export interface ResolvedOrderItem {
  productId: string;
  productName: string;
  unitCost: number;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discountAmount: number;
  totalPrice: number;
  notes?: string;
}

const orderInclude = {
  items: { include: { product: { select: { id: true, name: true } } } },
  orderTables: { include: { table: { select: { id: true, name: true } } } },
  customer: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.OrderInclude;

function statusesForPaidGroup(group: OrderPaidStatusGroup): OrderStatus[] {
  return (Object.keys(ORDER_STATUS_TO_PAID_GROUP) as OrderStatus[]).filter(
    (status) => ORDER_STATUS_TO_PAID_GROUP[status] === group,
  );
}

@Injectable()
export class OrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByClientTicketId(
    db: Db,
    establishmentId: string,
    clientTicketId: string,
  ) {
    return db.order.findFirst({
      where: { establishmentId, clientTicketId },
      include: orderInclude,
    });
  }

  createOrder(
    db: Db,
    establishmentId: string,
    data: {
      employeeId: string;
      orderType: string;
      orderNumber: string;
      tableIds: string[];
      customerId?: string;
      administratorId?: string;
      notes?: string;
      clientTicketId?: string;
      cashSessionId?: string;
      items: ResolvedOrderItem[];
      totals: {
        subtotal: number;
        taxAmount: number;
        discountAmount: number;
        totalAmount: number;
      };
    },
  ) {
    return db.order.create({
      data: {
        establishmentId,
        employeeId: data.employeeId,
        orderType: data.orderType as never,
        orderNumber: data.orderNumber,
        customerId: data.customerId,
        administratorId: data.administratorId,
        notes: data.notes,
        clientTicketId: data.clientTicketId,
        cashSessionId: data.cashSessionId,
        subtotal: data.totals.subtotal,
        taxAmount: data.totals.taxAmount,
        discountAmount: data.totals.discountAmount,
        totalAmount: data.totals.totalAmount,
        orderTables: { create: data.tableIds.map((tableId) => ({ tableId })) },
        items: { create: data.items },
      },
      include: orderInclude,
    });
  }

  findById(db: Db, establishmentId: string, id: string) {
    return db.order.findFirst({
      where: { id, establishmentId },
      include: orderInclude,
    });
  }

  async findAllPaginated(
    establishmentId: string,
    params: {
      page: number;
      pageSize: number;
      status?: OrderStatus;
      paidStatus?: OrderPaidStatusGroup;
    },
  ) {
    const where: Prisma.OrderWhereInput = {
      establishmentId,
      ...(params.paidStatus
        ? { status: { in: statusesForPaidGroup(params.paidStatus) } }
        : params.status
          ? { status: params.status }
          : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: orderInclude,
        orderBy: { createdAt: "desc" },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      this.prisma.order.count({ where }),
    ]);
    return { items, total };
  }

  updateOrderMeta(
    id: string,
    data: { customerId?: string; administratorId?: string; notes?: string },
  ) {
    return this.prisma.order.update({
      where: { id },
      data,
      include: orderInclude,
    });
  }

  updateOrderTotals(
    db: Db,
    id: string,
    totals: {
      subtotal: number;
      taxAmount: number;
      discountAmount: number;
      totalAmount: number;
    },
  ) {
    return db.order.update({ where: { id }, data: totals });
  }

  updateGlobalDiscount(
    db: Db,
    id: string,
    input: {
      globalDiscountType: "PERCENTAGE" | "FIXED" | null;
      globalDiscountValue: number | null;
      totalAmount: number;
    },
  ) {
    return db.order.update({
      where: { id },
      data: {
        globalDiscountType: input.globalDiscountType,
        globalDiscountValue: input.globalDiscountValue,
        totalAmount: input.totalAmount,
      },
    });
  }

  addItem(db: Db, orderId: string, item: ResolvedOrderItem) {
    return db.orderItem.create({ data: { orderId, ...item } });
  }

  findItem(db: Db, orderId: string, itemId: string) {
    return db.orderItem.findFirst({ where: { id: itemId, orderId } });
  }

  updateItem(
    db: Db,
    itemId: string,
    data: {
      quantity?: number;
      discountAmount?: number;
      totalPrice?: number;
      notes?: string;
    },
  ) {
    return db.orderItem.update({ where: { id: itemId }, data });
  }

  deleteItem(db: Db, itemId: string) {
    return db.orderItem.delete({ where: { id: itemId } });
  }

  updateActiveItemsStatus(db: Db, orderId: string, status: OrderItemStatus) {
    return db.orderItem.updateMany({
      where: { orderId, status: { not: "CANCELLED" } },
      data: { status },
    });
  }

  updateOrderStatus(db: Db, id: string, status: OrderStatus, closedAt?: Date) {
    return db.order.update({
      where: { id },
      data: { status, ...(closedAt ? { closedAt } : {}) },
    });
  }

  // Numéro de facture séquentiel sans trou, attribué uniquement au passage
  // en PAID — jamais à la création (voir orderNumber, non-gapless, plus
  // haut). Le compteur atomique (increment en base, même colonne dédiée
  // que CashSession.closureNumber) évite la course qu'aurait un count()
  // applicatif sous deux encaissements simultanés.
  async assignInvoiceNumber(
    db: Db,
    establishmentId: string,
    orderId: string,
  ): Promise<string> {
    const establishment = await db.establishment.update({
      where: { id: establishmentId },
      data: { nextInvoiceNumber: { increment: 1 } },
      select: { nextInvoiceNumber: true },
    });
    const sequence = establishment.nextInvoiceNumber - 1;
    const invoiceNumber = `FACT-${String(sequence).padStart(6, "0")}`;
    await db.order.update({ where: { id: orderId }, data: { invoiceNumber } });
    return invoiceNumber;
  }

  // Compteur de journée commerciale (non-gapless — simple référence de
  // travail avant paiement, pas un numéro de facture officiel).
  async countOrdersToday(
    establishmentId: string,
    since: Date,
  ): Promise<number> {
    return this.prisma.order.count({
      where: { establishmentId, createdAt: { gte: since } },
    });
  }
}
