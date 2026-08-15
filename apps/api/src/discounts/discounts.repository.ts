import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

export interface DiscountData {
  name: string;
  type: "PERCENTAGE" | "FIXED";
  value: number;
  code?: string;
  startDate?: Date;
  endDate?: Date;
}

@Injectable()
export class DiscountsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAllForEstablishment(establishmentId: string) {
    return this.prisma.discount.findMany({
      where: { establishmentId },
      orderBy: { name: "asc" },
    });
  }

  // Utilisé par le module Commandes pour peupler le sélecteur de remises :
  // uniquement celles actives et dans leur fenêtre de validité.
  findActiveForEstablishment(establishmentId: string) {
    const now = new Date();
    return this.prisma.discount.findMany({
      where: {
        establishmentId,
        isActive: true,
        OR: [{ startDate: null }, { startDate: { lte: now } }],
        AND: [{ OR: [{ endDate: null }, { endDate: { gte: now } }] }],
      },
      orderBy: { name: "asc" },
    });
  }

  findById(establishmentId: string, id: string) {
    return this.prisma.discount.findFirst({ where: { id, establishmentId } });
  }

  create(establishmentId: string, data: DiscountData) {
    return this.prisma.discount.create({ data: { ...data, establishmentId } });
  }

  update(id: string, data: Partial<DiscountData> & { isActive?: boolean }) {
    return this.prisma.discount.update({ where: { id }, data });
  }

  // Suppression définitive (pas de soft delete) — les lignes de commande
  // qui référencent une remise conservent leur discountAmount en instantané
  // numérique, pas une dépendance vivante à la ligne Discount.
  remove(id: string) {
    return this.prisma.discount.delete({ where: { id } });
  }
}
