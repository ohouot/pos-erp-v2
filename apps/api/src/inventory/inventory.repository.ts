import { Injectable } from "@nestjs/common";
import type {
  Prisma,
  PrismaClient,
  InventorySessionStatus,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service.js";

export type Db = Prisma.TransactionClient | PrismaClient;

const sessionInclude = {
  items: { include: { product: { select: { id: true, name: true } } } },
} satisfies Prisma.InventorySessionInclude;

@Injectable()
export class InventoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  createSession(
    establishmentId: string,
    employeeId: string,
    notes: string | undefined,
  ) {
    return this.prisma.inventorySession.create({
      data: { establishmentId, employeeId, notes },
      include: sessionInclude,
    });
  }

  async findAllPaginated(
    establishmentId: string,
    params: { page: number; pageSize: number },
  ) {
    const where: Prisma.InventorySessionWhereInput = { establishmentId };
    const [items, total] = await Promise.all([
      this.prisma.inventorySession.findMany({
        where,
        orderBy: { startedAt: "desc" },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      this.prisma.inventorySession.count({ where }),
    ]);
    return { items, total };
  }

  findById(db: Db, establishmentId: string, id: string) {
    return db.inventorySession.findFirst({
      where: { id, establishmentId },
      include: sessionInclude,
    });
  }

  updateSessionStatus(
    db: Db,
    id: string,
    status: InventorySessionStatus,
    completedAt?: Date,
  ) {
    return db.inventorySession.update({
      where: { id },
      data: { status, ...(completedAt ? { completedAt } : {}) },
    });
  }

  // Recompte d'un même produit : écrase la ligne existante (realQuantity,
  // difference, notes) sans retoucher theoreticalQuantity, figé à la
  // première saisie — même contrat que le projet de référence.
  upsertItem(
    db: Db,
    input: {
      inventorySessionId: string;
      productId: string;
      theoreticalQuantity: number;
      realQuantity: number;
      notes?: string;
    },
  ) {
    const difference = input.realQuantity - input.theoreticalQuantity;
    return db.inventoryItem.upsert({
      where: {
        inventorySessionId_productId: {
          inventorySessionId: input.inventorySessionId,
          productId: input.productId,
        },
      },
      create: {
        inventorySessionId: input.inventorySessionId,
        productId: input.productId,
        theoreticalQuantity: input.theoreticalQuantity,
        realQuantity: input.realQuantity,
        difference,
        notes: input.notes,
      },
      update: {
        realQuantity: input.realQuantity,
        difference,
        notes: input.notes,
      },
      include: { product: { select: { id: true, name: true } } },
    });
  }

  removeItem(db: Db, inventorySessionId: string, productId: string) {
    return db.inventoryItem.delete({
      where: {
        inventorySessionId_productId: { inventorySessionId, productId },
      },
    });
  }
}
