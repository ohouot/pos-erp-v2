import { Injectable } from "@nestjs/common";
import type { Prisma, PrismaClient, StockMovementType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service.js";

export type Db = Prisma.TransactionClient | PrismaClient;

export interface CreateStockMovementInput {
  establishmentId: string;
  productId: string;
  type: StockMovementType;
  quantity: number;
  quantityBefore: number;
  quantityAfter: number;
  referenceType?: string;
  referenceId?: string;
  employeeId?: string;
  reason?: string;
}

@Injectable()
export class StockRepository {
  constructor(private readonly prisma: PrismaService) {}

  findProductForDeduction(db: Db, establishmentId: string, productId: string) {
    return db.product.findFirst({
      where: { id: productId, establishmentId, deletedAt: null },
      include: { recipe: { include: { ingredients: true } } },
    });
  }

  findProductBasic(db: Db, establishmentId: string, productId: string) {
    return db.product.findFirst({
      where: { id: productId, establishmentId, deletedAt: null },
    });
  }

  // Décrément conditionnel atomique : la clause currentStock >= quantity
  // fait partie du WHERE de l'UPDATE lui-même (une seule requête SQL, pas
  // lecture-puis-écriture) — sous deux ventes concurrentes sur le dernier
  // article, une seule des deux mises à jour peut matcher la ligne, l'autre
  // échoue avec P2025 plutôt que de laisser le stock passer sous 0.
  decrementProductStock(db: Db, productId: string, quantity: number) {
    return db.product.update({
      where: { id: productId, currentStock: { gte: quantity } },
      data: { currentStock: { decrement: quantity } },
    });
  }

  incrementProductStock(db: Db, productId: string, quantity: number) {
    return db.product.update({
      where: { id: productId },
      data: { currentStock: { increment: quantity } },
    });
  }

  setProductStock(db: Db, productId: string, quantity: number) {
    return db.product.update({
      where: { id: productId },
      data: { currentStock: quantity },
    });
  }

  createStockMovement(db: Db, input: CreateStockMovementInput) {
    return db.stockMovement.create({ data: input });
  }

  async findAllMovements(
    establishmentId: string,
    params: {
      page: number;
      pageSize: number;
      productId?: string;
      type?: StockMovementType;
      from?: Date;
      to?: Date;
    },
  ) {
    const where: Prisma.StockMovementWhereInput = {
      establishmentId,
      ...(params.productId ? { productId: params.productId } : {}),
      ...(params.type ? { type: params.type } : {}),
      ...(params.from || params.to
        ? {
            createdAt: {
              ...(params.from ? { gte: params.from } : {}),
              ...(params.to ? { lte: params.to } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        include: {
          product: { select: { id: true, name: true } },
          employee: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    return { items, total };
  }

  findAllMovementsForExport(
    establishmentId: string,
    params: {
      productId?: string;
      type?: StockMovementType;
      from?: Date;
      to?: Date;
    },
  ) {
    const where: Prisma.StockMovementWhereInput = {
      establishmentId,
      ...(params.productId ? { productId: params.productId } : {}),
      ...(params.type ? { type: params.type } : {}),
      ...(params.from || params.to
        ? {
            createdAt: {
              ...(params.from ? { gte: params.from } : {}),
              ...(params.to ? { lte: params.to } : {}),
            },
          }
        : {}),
    };

    return this.prisma.stockMovement.findMany({
      where,
      include: {
        product: { select: { id: true, name: true } },
        employee: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findLowStockProducts(establishmentId: string) {
    const products = await this.prisma.product.findMany({
      where: { establishmentId, deletedAt: null, manageStock: true },
      select: { id: true, name: true, currentStock: true, minStock: true },
    });
    return products.filter((p) => Number(p.currentStock) <= Number(p.minStock));
  }

  findOrdersByIds(ids: string[]) {
    return this.prisma.order.findMany({
      where: { id: { in: ids } },
      select: { id: true, orderNumber: true },
    });
  }

  findPurchasesByIds(ids: string[]) {
    return this.prisma.purchase.findMany({
      where: { id: { in: ids } },
      select: { id: true, invoiceNumber: true },
    });
  }

  findInventorySessionsByIds(ids: string[]) {
    return this.prisma.inventorySession.findMany({
      where: { id: { in: ids } },
      select: { id: true, startedAt: true },
    });
  }
}
