import { Injectable } from "@nestjs/common";
import type { Prisma, PrismaClient, BankMovementType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service.js";

export type Db = Prisma.TransactionClient | PrismaClient;

const accountInclude = {
  movements: { orderBy: { createdAt: "desc" as const } },
} satisfies Prisma.BankAccountInclude;

export interface BankAccountData {
  name: string;
  notes?: string;
}

@Injectable()
export class BankRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAllForEstablishment(establishmentId: string) {
    return this.prisma.bankAccount.findMany({
      where: { establishmentId },
      include: accountInclude,
      orderBy: { name: "asc" },
    });
  }

  findById(establishmentId: string, id: string) {
    return this.prisma.bankAccount.findFirst({
      where: { id, establishmentId },
      include: accountInclude,
    });
  }

  create(establishmentId: string, data: BankAccountData) {
    return this.prisma.bankAccount.create({
      data: { ...data, establishmentId },
      include: accountInclude,
    });
  }

  update(id: string, data: Partial<BankAccountData> & { isActive?: boolean }) {
    return this.prisma.bankAccount.update({
      where: { id },
      data,
      include: accountInclude,
    });
  }

  countMovements(id: string): Promise<number> {
    return this.prisma.bankMovement.count({ where: { bankAccountId: id } });
  }

  remove(id: string) {
    return this.prisma.bankAccount.delete({ where: { id } });
  }

  incrementBalance(db: Db, id: string, amount: number) {
    return db.bankAccount.update({
      where: { id },
      data: { currentBalance: { increment: amount } },
    });
  }

  decrementBalance(db: Db, id: string, amount: number) {
    return db.bankAccount.update({
      where: { id },
      data: { currentBalance: { decrement: amount } },
    });
  }

  createMovement(
    db: Db,
    bankAccountId: string,
    employeeId: string,
    type: BankMovementType,
    data: { amount: number; reason?: string },
  ) {
    return db.bankMovement.create({
      data: { bankAccountId, employeeId, type, ...data },
    });
  }
}
