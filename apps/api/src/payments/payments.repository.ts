import { Injectable } from "@nestjs/common";
import type { Prisma, PrismaClient } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service.js";

export type Db = Prisma.TransactionClient | PrismaClient;

@Injectable()
export class PaymentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  createPayment(
    db: Db,
    establishmentId: string,
    orderId: string,
    cashSessionId: string,
    employeeId: string,
    data: {
      paymentMethodId: string;
      amount: number;
      amountReceived?: number;
      changeGiven?: number;
      reference?: string;
    },
  ) {
    return db.payment.create({
      data: { establishmentId, orderId, cashSessionId, employeeId, ...data },
      include: { paymentMethod: true },
    });
  }

  findAllForOrder(establishmentId: string, orderId: string) {
    return this.prisma.payment.findMany({
      where: { establishmentId, orderId },
      include: { paymentMethod: true },
      orderBy: { createdAt: "asc" },
    });
  }
}
