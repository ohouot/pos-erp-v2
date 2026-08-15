import { Injectable } from "@nestjs/common";
import type { Prisma, PrismaClient } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service.js";

export type Db = Prisma.TransactionClient | PrismaClient;

// Moyens de paiement de base, créés avec chaque nouvel établissement pour
// qu'il soit immédiatement utilisable à l'encaissement — modifiables/
// désactivables ensuite (voir Lot 6, module paymentMethods).
const DEFAULT_PAYMENT_METHODS = [
  { code: "CASH", label: "Espèces", displayOrder: 0 },
  { code: "WAVE", label: "Wave", displayOrder: 1 },
  { code: "MOBILE_MONEY_ORANGE", label: "Orange Money", displayOrder: 2 },
  { code: "MOBILE_MONEY_MTN", label: "MTN Money", displayOrder: 3 },
] satisfies Prisma.PaymentMethodCreateWithoutEstablishmentInput[];

@Injectable()
export class EstablishmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Accepte un client transactionnel (voir AuthRepository.registerAccount,
  // qui crée l'utilisateur, l'établissement et son rattachement RBAC dans
  // une seule transaction) — this.prisma par défaut pour les autres appels.
  createEstablishment(
    ownerId: string,
    data: Omit<Prisma.EstablishmentCreateInput, "owner">,
    db: Db = this.prisma,
  ) {
    return db.establishment.create({
      data: {
        ...data,
        owner: { connect: { id: ownerId } },
        paymentMethods: { create: DEFAULT_PAYMENT_METHODS },
      },
    });
  }

  findById(id: string) {
    return this.prisma.establishment.findUnique({ where: { id } });
  }

  // Un établissement est accessible à un utilisateur s'il en est le
  // propriétaire, ou s'il en est membre actif (UserEstablishment).
  findAllAccessibleTo(userId: string) {
    return this.prisma.establishment.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { members: { some: { userId, isActive: true } } },
        ],
      },
      orderBy: { createdAt: "asc" },
    });
  }

  // Un Super Administrateur voit tous les établissements de la plateforme.
  findAll() {
    return this.prisma.establishment.findMany({
      orderBy: { createdAt: "asc" },
    });
  }

  updateEstablishment(id: string, data: Prisma.EstablishmentUpdateInput) {
    return this.prisma.establishment.update({ where: { id }, data });
  }
}
