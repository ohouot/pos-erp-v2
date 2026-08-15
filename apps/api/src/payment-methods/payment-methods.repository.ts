import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

export interface PaymentMethodData {
  code: string;
  label: string;
  displayOrder?: number;
}

@Injectable()
export class PaymentMethodsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAllForEstablishment(establishmentId: string, activeOnly?: boolean) {
    return this.prisma.paymentMethod.findMany({
      where: { establishmentId, ...(activeOnly ? { isActive: true } : {}) },
      orderBy: { displayOrder: "asc" },
    });
  }

  findById(establishmentId: string, id: string) {
    return this.prisma.paymentMethod.findFirst({
      where: { id, establishmentId },
    });
  }

  create(establishmentId: string, data: PaymentMethodData) {
    return this.prisma.paymentMethod.create({
      data: { ...data, establishmentId },
    });
  }

  update(
    id: string,
    data: { label?: string; displayOrder?: number; isActive?: boolean },
  ) {
    return this.prisma.paymentMethod.update({ where: { id }, data });
  }

  countPayments(id: string): Promise<number> {
    return this.prisma.payment.count({ where: { paymentMethodId: id } });
  }

  remove(id: string) {
    return this.prisma.paymentMethod.delete({ where: { id } });
  }
}
