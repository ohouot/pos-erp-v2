import { Injectable } from "@nestjs/common";
import type { Prisma, PrismaClient, PurchaseStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service.js";

export type Db = Prisma.TransactionClient | PrismaClient;

export interface PurchaseItemInput {
  productId: string;
  unitId: string;
  quantity: number;
  purchasePrice: number;
  suggestedSalePrice?: number;
}

export interface PurchaseWriteData {
  supplierId: string;
  invoiceNumber?: string;
  purchaseDate?: Date;
  observation?: string;
  items: PurchaseItemInput[];
}

const purchaseInclude = {
  supplier: { select: { id: true, name: true } },
  items: {
    include: { product: { select: { id: true, name: true } }, unit: true },
  },
} satisfies Prisma.PurchaseInclude;

function computeTotalAmount(items: PurchaseItemInput[]): number {
  return items.reduce(
    (sum, item) => sum + item.quantity * item.purchasePrice,
    0,
  );
}

@Injectable()
export class PurchasesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(establishmentId: string, employeeId: string, data: PurchaseWriteData) {
    return this.prisma.purchase.create({
      data: {
        establishmentId,
        employeeId,
        supplierId: data.supplierId,
        invoiceNumber: data.invoiceNumber,
        purchaseDate: data.purchaseDate,
        observation: data.observation,
        totalAmount: computeTotalAmount(data.items),
        items: { create: data.items },
      },
      include: purchaseInclude,
    });
  }

  findById(establishmentId: string, id: string) {
    return this.prisma.purchase.findFirst({
      where: { id, establishmentId },
      include: purchaseInclude,
    });
  }

  async findAllPaginated(
    establishmentId: string,
    params: {
      page: number;
      pageSize: number;
      status?: PurchaseStatus;
      supplierId?: string;
    },
  ) {
    const where: Prisma.PurchaseWhereInput = {
      establishmentId,
      ...(params.status ? { status: params.status } : {}),
      ...(params.supplierId ? { supplierId: params.supplierId } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.purchase.findMany({
        where,
        include: purchaseInclude,
        orderBy: { purchaseDate: "desc" },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      this.prisma.purchase.count({ where }),
    ]);
    return { items, total };
  }

  // Remplace intégralement les lignes si items est fourni — même contrat
  // que packagingUnits (produits) et ingredients (recettes).
  async update(id: string, data: Partial<PurchaseWriteData>) {
    const { items, ...rest } = data;
    return this.prisma.$transaction(async (tx) => {
      if (items) {
        await tx.purchaseItem.deleteMany({ where: { purchaseId: id } });
      }
      return tx.purchase.update({
        where: { id },
        data: {
          ...rest,
          ...(items
            ? {
                totalAmount: computeTotalAmount(items),
                items: { create: items },
              }
            : {}),
        },
        include: purchaseInclude,
      });
    });
  }

  updateStatus(db: Db, id: string, status: PurchaseStatus) {
    return db.purchase.update({ where: { id }, data: { status } });
  }
}
