import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { OrderStatus } from "@prisma/client";
import type { OrderPaidStatusGroup } from "@pos-erp-v2/shared";
import { PrismaService } from "../prisma/prisma.service.js";
import {
  OrdersRepository,
  type ResolvedOrderItem,
} from "./orders.repository.js";
import { TablesRepository } from "../tables/tables.repository.js";
import { ProductsRepository } from "../products/products.repository.js";
import {
  StockDeductionService,
  type StockChangeResult,
} from "../stock/stock-deduction.service.js";
import { StockAlertsService } from "../stock/stock-alerts.service.js";
import { NotificationsService } from "../notifications/notifications.service.js";
import { RealtimeService } from "../realtime/realtime.service.js";
import {
  resolvePriceForTier,
  computeEffectiveUnitPrice,
  computeLineTotals,
  computeOrderTotals,
  applyGlobalDiscount,
} from "./orders.pricing.js";
import type { CreateOrderDto } from "./dto/create-order.dto.js";
import type { OrderItemInputDto } from "./dto/order-item.dto.js";
import type { UpdateOrderDto } from "./dto/update-order.dto.js";
import type { UpdateOrderItemDto } from "./dto/update-order-item.dto.js";
import type { ApplyGlobalDiscountDto } from "./dto/apply-global-discount.dto.js";

function assertOpen(status: string): void {
  if (status !== "OPEN") {
    throw new BadRequestException(
      "Impossible de modifier une commande qui n'est plus ouverte",
    );
  }
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersRepository: OrdersRepository,
    private readonly tablesRepository: TablesRepository,
    private readonly productsRepository: ProductsRepository,
    private readonly stockDeductionService: StockDeductionService,
    private readonly stockAlertsService: StockAlertsService,
    private readonly notificationsService: NotificationsService,
    private readonly realtimeService: RealtimeService,
  ) {}

  private async assertTablesAvailable(
    establishmentId: string,
    tableIds: string[],
  ): Promise<void> {
    if (tableIds.length === 0) return;
    const tables = await this.tablesRepository.findManyByIds(
      this.prisma,
      establishmentId,
      tableIds,
    );
    if (tables.length !== tableIds.length) {
      throw new BadRequestException(
        "Une ou plusieurs tables sont introuvables",
      );
    }
    const unavailable = tables.find((t) => t.status !== "FREE");
    if (unavailable) {
      throw new BadRequestException(
        `La table "${unavailable.name}" n'est pas libre`,
      );
    }
  }

  // Remise de ligne : soit une remise catalogue (discountId, résolue,
  // revalidée — active ET dans sa fenêtre de dates — puis plafonnée au
  // montant brut de la ligne), soit un montant manuel (également plafonné)
  // — jamais négative, jamais au-delà du brut. Revalider isActive/
  // startDate/endDate ici (pas seulement à la lecture de la liste "actives"
  // du module Remises) évite qu'une remise désactivée ou expirée entre-temps
  // reste appliquable via un discountId obsolète conservé côté client.
  private async resolveDiscountAmount(
    establishmentId: string,
    grossAmount: number,
    input: { discountAmount?: number; discountId?: string },
  ): Promise<number> {
    if (input.discountId) {
      const discount = await this.prisma.discount.findFirst({
        where: { id: input.discountId, establishmentId },
      });
      if (!discount) {
        throw new BadRequestException("Remise introuvable");
      }
      if (!discount.isActive) {
        throw new BadRequestException(
          `La remise "${discount.name}" n'est plus active`,
        );
      }
      const now = new Date();
      if (discount.startDate && discount.startDate > now) {
        throw new BadRequestException(
          `La remise "${discount.name}" n'est pas encore valide`,
        );
      }
      if (discount.endDate && discount.endDate < now) {
        throw new BadRequestException(`La remise "${discount.name}" a expiré`);
      }
      const amount =
        discount.type === "PERCENTAGE"
          ? grossAmount * (Number(discount.value) / 100)
          : Number(discount.value);
      return Math.max(0, Math.min(amount, grossAmount));
    }
    return Math.max(0, Math.min(input.discountAmount ?? 0, grossAmount));
  }

  private async resolveItem(
    establishmentId: string,
    input: OrderItemInputDto,
  ): Promise<ResolvedOrderItem> {
    const product = await this.productsRepository.findById(
      establishmentId,
      input.productId,
    );
    if (!product) throw new BadRequestException("Produit introuvable");

    const unitPrice = resolvePriceForTier(
      {
        salePrice: Number(product.salePrice),
        salePrice2:
          product.salePrice2 != null ? Number(product.salePrice2) : null,
        salePrice3:
          product.salePrice3 != null ? Number(product.salePrice3) : null,
      },
      input.priceTier ?? 1,
    );
    const taxRate = Number(product.taxRate);
    const grossAmount = unitPrice * input.quantity;
    const discountAmount = await this.resolveDiscountAmount(
      establishmentId,
      grossAmount,
      input,
    );

    if (product.minSalePrice != null) {
      const effective = computeEffectiveUnitPrice(
        input.quantity,
        unitPrice,
        discountAmount,
      );
      if (effective < Number(product.minSalePrice)) {
        throw new BadRequestException(
          `Le prix de vente de "${product.name}" ne peut pas descendre sous le minimum autorisé (${product.minSalePrice})`,
        );
      }
    }

    const { totalPrice } = computeLineTotals(
      unitPrice,
      input.quantity,
      taxRate,
      discountAmount,
    );

    return {
      productId: input.productId,
      productName: product.name,
      unitCost: Number(product.purchasePrice),
      quantity: input.quantity,
      unitPrice,
      taxRate,
      discountAmount,
      totalPrice,
      notes: input.notes,
    };
  }

  private async generateOrderNumber(establishmentId: string): Promise<string> {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const countToday = await this.ordersRepository.countOrdersToday(
      establishmentId,
      dayStart,
    );
    const datePart = dayStart.toISOString().slice(0, 10).replace(/-/g, "");
    return `CMD-${datePart}-${String(countToday + 1).padStart(3, "0")}`;
  }

  // Idempotent : un clientTicketId déjà vu (rejeu de synchronisation hors
  // ligne) renvoie la commande existante plutôt que d'en créer une seconde.
  async createOrder(
    establishmentId: string,
    employeeId: string,
    input: CreateOrderDto,
  ) {
    if (input.clientTicketId) {
      const existing = await this.ordersRepository.findByClientTicketId(
        this.prisma,
        establishmentId,
        input.clientTicketId,
      );
      if (existing) return existing;
    }

    const tableIds = input.tableIds ?? [];
    await this.assertTablesAvailable(establishmentId, tableIds);

    const items = await Promise.all(
      (input.items ?? []).map((item) =>
        this.resolveItem(establishmentId, item),
      ),
    );
    const totals = computeOrderTotals(items);
    const orderNumber = await this.generateOrderNumber(establishmentId);

    try {
      const order = await this.prisma.$transaction(async (tx) => {
        const order = await this.ordersRepository.createOrder(
          tx,
          establishmentId,
          {
            employeeId,
            orderType: input.orderType ?? "DINE_IN",
            orderNumber,
            tableIds,
            customerId: input.customerId,
            administratorId: input.administratorId,
            notes: input.notes,
            clientTicketId: input.clientTicketId,
            items,
            totals,
          },
        );
        await this.tablesRepository.occupyTables(tx, tableIds);
        return order;
      });

      const tableNames = order.orderTables.map((ot) => ot.table.name);
      await this.notificationsService.notify({
        establishmentId,
        type: "NEW_ORDER",
        title: "Nouvelle commande",
        message: `Commande ${order.orderNumber} créée${tableNames.length ? ` (${tableNames.join(", ")})` : ""}.`,
        data: { orderId: order.id },
      });
      this.realtimeService.emitToEstablishment(
        establishmentId,
        "order:created",
        { orderId: order.id },
      );
      if (tableIds.length > 0) {
        this.realtimeService.emitToEstablishment(
          establishmentId,
          "table:updated",
          {},
        );
      }

      return order;
    } catch (err) {
      // Deux appels concurrents avec le même clientTicketId (ex: double
      // synchronisation hors ligne) : la contrainte unique gagne la course,
      // on renvoie la commande créée par l'autre appel plutôt que d'échouer.
      if (
        input.clientTicketId &&
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        const existing = await this.ordersRepository.findByClientTicketId(
          this.prisma,
          establishmentId,
          input.clientTicketId,
        );
        if (existing) return existing;
      }
      throw err;
    }
  }

  async list(
    establishmentId: string,
    params: {
      page: number;
      pageSize: number;
      status?: OrderStatus;
      paidStatus?: OrderPaidStatusGroup;
    },
  ) {
    const { items, total } = await this.ordersRepository.findAllPaginated(
      establishmentId,
      params,
    );
    return {
      items,
      meta: {
        page: params.page,
        pageSize: params.pageSize,
        total,
        totalPages: Math.ceil(total / params.pageSize),
      },
    };
  }

  private async findOrThrow(establishmentId: string, id: string) {
    const order = await this.ordersRepository.findById(
      this.prisma,
      establishmentId,
      id,
    );
    if (!order) throw new NotFoundException("Commande introuvable");
    return order;
  }

  get(establishmentId: string, id: string) {
    return this.findOrThrow(establishmentId, id);
  }

  async update(establishmentId: string, id: string, input: UpdateOrderDto) {
    const order = await this.findOrThrow(establishmentId, id);
    assertOpen(order.status);
    return this.ordersRepository.updateOrderMeta(id, input);
  }

  // Ré-agrège les totaux depuis les lignes actives, puis réapplique la
  // remise globale existante (jamais relue depuis la requête appelante en
  // cours de route) pour qu'elle survive à une édition de ligne.
  private async recomputeTotals(
    db: Prisma.TransactionClient,
    establishmentId: string,
    orderId: string,
  ) {
    const order = await this.ordersRepository.findById(
      db,
      establishmentId,
      orderId,
    );
    if (!order) return;
    const activeItems = order.items.filter((i) => i.status !== "CANCELLED");
    const totals = computeOrderTotals(
      activeItems.map((i) => ({
        unitPrice: Number(i.unitPrice),
        quantity: Number(i.quantity),
        taxRate: Number(i.taxRate),
        discountAmount: Number(i.discountAmount),
      })),
    );
    const totalAmount = applyGlobalDiscount(
      totals.totalAmount,
      order.globalDiscountType as "PERCENTAGE" | "FIXED" | null,
      order.globalDiscountValue != null
        ? Number(order.globalDiscountValue)
        : null,
    );
    await this.ordersRepository.updateOrderTotals(db, orderId, {
      ...totals,
      totalAmount,
    });
  }

  async addItem(
    establishmentId: string,
    orderId: string,
    input: OrderItemInputDto,
  ) {
    const order = await this.findOrThrow(establishmentId, orderId);
    assertOpen(order.status);
    const item = await this.resolveItem(establishmentId, input);
    return this.prisma.$transaction(async (tx) => {
      const created = await this.ordersRepository.addItem(tx, orderId, item);
      await this.recomputeTotals(tx, establishmentId, orderId);
      return created;
    });
  }

  async updateItem(
    establishmentId: string,
    orderId: string,
    itemId: string,
    input: UpdateOrderItemDto,
  ) {
    const order = await this.findOrThrow(establishmentId, orderId);
    assertOpen(order.status);
    const item = order.items.find((i) => i.id === itemId);
    if (!item) throw new NotFoundException("Ligne introuvable");

    const quantity = input.quantity ?? Number(item.quantity);
    const grossAmount = Number(item.unitPrice) * quantity;
    const discountAmount =
      input.discountAmount != null || input.discountId
        ? await this.resolveDiscountAmount(establishmentId, grossAmount, input)
        : Number(item.discountAmount);

    // Le plancher est une politique de caisse vivante, pas figée comme le
    // prix unitaire de la ligne — relu depuis le catalogue à chaque édition.
    const product = await this.productsRepository.findById(
      establishmentId,
      item.productId,
    );
    if (product?.minSalePrice != null) {
      const effective = computeEffectiveUnitPrice(
        quantity,
        Number(item.unitPrice),
        discountAmount,
      );
      if (effective < Number(product.minSalePrice)) {
        throw new BadRequestException(
          `Le prix de vente de "${product.name}" ne peut pas descendre sous le minimum autorisé (${product.minSalePrice})`,
        );
      }
    }

    const { totalPrice } = computeLineTotals(
      Number(item.unitPrice),
      quantity,
      Number(item.taxRate),
      discountAmount,
    );

    return this.prisma.$transaction(async (tx) => {
      const updated = await this.ordersRepository.updateItem(tx, itemId, {
        quantity,
        discountAmount,
        totalPrice,
        notes: input.notes,
      });
      await this.recomputeTotals(tx, establishmentId, orderId);
      return updated;
    });
  }

  async removeItem(establishmentId: string, orderId: string, itemId: string) {
    const order = await this.findOrThrow(establishmentId, orderId);
    assertOpen(order.status);
    if (!order.items.some((i) => i.id === itemId)) {
      throw new NotFoundException("Ligne introuvable");
    }
    await this.prisma.$transaction(async (tx) => {
      await this.ordersRepository.deleteItem(tx, itemId);
      await this.recomputeTotals(tx, establishmentId, orderId);
    });
  }

  // Contrairement aux lignes, la remise globale reste modifiable tant que
  // la commande n'est pas soldée/annulée (OPEN, SENT_TO_KITCHEN, SERVED).
  async applyGlobalDiscount(
    establishmentId: string,
    orderId: string,
    input: ApplyGlobalDiscountDto,
  ) {
    const order = await this.findOrThrow(establishmentId, orderId);
    if (order.status === "PAID" || order.status === "CANCELLED") {
      throw new BadRequestException(
        "Impossible de modifier une commande soldée ou annulée",
      );
    }
    const activeItems = order.items.filter((i) => i.status !== "CANCELLED");
    const totals = computeOrderTotals(
      activeItems.map((i) => ({
        unitPrice: Number(i.unitPrice),
        quantity: Number(i.quantity),
        taxRate: Number(i.taxRate),
        discountAmount: Number(i.discountAmount),
      })),
    );
    const totalAmount = applyGlobalDiscount(
      totals.totalAmount,
      input.type,
      input.value,
    );
    return this.ordersRepository.updateGlobalDiscount(this.prisma, orderId, {
      globalDiscountType: input.type,
      globalDiscountValue: input.type ? input.value : null,
      totalAmount,
    });
  }

  // Point de bascule métier : c'est ici, pas à la création, que le stock
  // est réellement consommé (produits simples ET recettes) — une commande
  // OPEN encore en cours de saisie ne doit jamais impacter le stock.
  async sendToKitchen(
    establishmentId: string,
    orderId: string,
    employeeId: string,
  ) {
    const order = await this.findOrThrow(establishmentId, orderId);
    assertOpen(order.status);

    const activeItems = order.items.filter((i) => i.status !== "CANCELLED");
    if (activeItems.length === 0) {
      throw new BadRequestException("Aucun article dans cette commande");
    }

    let stockChanges: StockChangeResult[] = [];
    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      stockChanges = await this.stockDeductionService.deductStockForSale(
        tx,
        establishmentId,
        activeItems.map((item) => ({
          productId: item.productId,
          quantitySold: Number(item.quantity),
        })),
        { referenceType: "ORDER", referenceId: orderId, employeeId },
      );
      await this.ordersRepository.updateActiveItemsStatus(
        tx,
        orderId,
        "PREPARING",
      );
      await this.ordersRepository.updateOrderStatus(
        tx,
        orderId,
        "SENT_TO_KITCHEN",
      );
      return this.ordersRepository.findById(tx, establishmentId, orderId);
    });

    for (const change of stockChanges) {
      await this.stockAlertsService.maybeNotifyLowStock(
        establishmentId,
        change,
      );
    }

    return { order: updatedOrder, stockChanges };
  }

  async markServed(establishmentId: string, orderId: string) {
    const order = await this.findOrThrow(establishmentId, orderId);
    if (order.status !== "SENT_TO_KITCHEN") {
      throw new BadRequestException(
        "Seule une commande envoyée en cuisine peut être marquée servie",
      );
    }
    return this.prisma.$transaction(async (tx) => {
      await this.ordersRepository.updateActiveItemsStatus(
        tx,
        orderId,
        "SERVED",
      );
      await this.ordersRepository.updateOrderStatus(tx, orderId, "SERVED");
      return this.ordersRepository.findById(tx, establishmentId, orderId);
    });
  }

  // Annulation restreinte aux commandes OPEN : aucun stock n'a encore été
  // déduit à ce stade (voir sendToKitchen), donc rien à réconcilier.
  async cancelOrder(establishmentId: string, orderId: string) {
    const order = await this.findOrThrow(establishmentId, orderId);
    assertOpen(order.status);

    const tableIds = order.orderTables.map((ot) => ot.tableId);
    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      await this.ordersRepository.updateActiveItemsStatus(
        tx,
        orderId,
        "CANCELLED",
      );
      await this.ordersRepository.updateOrderStatus(
        tx,
        orderId,
        "CANCELLED",
        new Date(),
      );
      await this.tablesRepository.freeTables(tx, tableIds);
      return this.ordersRepository.findById(tx, establishmentId, orderId);
    });

    if (tableIds.length > 0) {
      this.realtimeService.emitToEstablishment(
        establishmentId,
        "table:updated",
        {},
      );
    }

    return updatedOrder;
  }
}
