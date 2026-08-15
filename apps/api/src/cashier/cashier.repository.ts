import { Injectable } from "@nestjs/common";
import type { Prisma, PrismaClient, CashMovementType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service.js";

export type Db = Prisma.TransactionClient | PrismaClient;

const sessionInclude = {
  movements: { orderBy: { createdAt: "desc" as const } },
} satisfies Prisma.CashSessionInclude;

@Injectable()
export class CashierRepository {
  constructor(private readonly prisma: PrismaService) {}

  findOpenSession(db: Db, establishmentId: string) {
    return db.cashSession.findFirst({
      where: { establishmentId, status: "OPEN" },
      include: sessionInclude,
    });
  }

  createSession(
    establishmentId: string,
    employeeId: string,
    data: { openingBalance: number; notes?: string },
  ) {
    return this.prisma.cashSession.create({
      data: { establishmentId, employeeId, ...data },
      include: sessionInclude,
    });
  }

  findById(establishmentId: string, id: string) {
    return this.prisma.cashSession.findFirst({
      where: { id, establishmentId },
      include: sessionInclude,
    });
  }

  async findAllPaginated(
    establishmentId: string,
    params: { page: number; pageSize: number },
  ) {
    const where: Prisma.CashSessionWhereInput = { establishmentId };
    const [items, total] = await Promise.all([
      this.prisma.cashSession.findMany({
        where,
        orderBy: { openedAt: "desc" },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      this.prisma.cashSession.count({ where }),
    ]);
    return { items, total };
  }

  createMovement(
    sessionId: string,
    employeeId: string,
    type: CashMovementType,
    data: { amount: number; reason?: string },
  ) {
    return this.prisma.cashMovement.create({
      data: { cashSessionId: sessionId, employeeId, type, ...data },
    });
  }

  // Seuls les encaissements en espèces (code "CASH") alimentent le solde
  // théorique de caisse à la clôture — les autres moyens ne transitent pas
  // par le tiroir-caisse physique.
  async sumCashPayments(sessionId: string): Promise<number> {
    const result = await this.prisma.payment.aggregate({
      where: { cashSessionId: sessionId, paymentMethod: { code: "CASH" } },
      _sum: { amount: true },
    });
    return Number(result._sum.amount ?? 0);
  }

  findPaymentsForSummary(sessionId: string) {
    return this.prisma.payment.findMany({
      where: { cashSessionId: sessionId },
      include: {
        paymentMethod: { select: { code: true } },
        order: { select: { invoiceNumber: true, id: true } },
      },
    });
  }

  incrementClosureNumber(db: Db, establishmentId: string) {
    return db.establishment.update({
      where: { id: establishmentId },
      data: { nextClosureNumber: { increment: 1 } },
      select: { nextClosureNumber: true },
    });
  }

  closeSession(
    db: Db,
    id: string,
    data: {
      closingBalanceExpected: number;
      closingBalanceCounted: number;
      difference: number;
      notes?: string;
      closureNumber: number;
      summary: Prisma.InputJsonValue;
    },
  ) {
    return db.cashSession.update({
      where: { id },
      data: { ...data, status: "CLOSED", closedAt: new Date() },
    });
  }
}
