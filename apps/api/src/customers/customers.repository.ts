import { Injectable } from "@nestjs/common";
import type { Prisma, PrismaClient } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service.js";

export type Db = Prisma.TransactionClient | PrismaClient;

export interface CustomerData {
  firstName: string;
  lastName?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

@Injectable()
export class CustomersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllPaginated(
    establishmentId: string,
    params: { page: number; pageSize: number; search?: string },
  ) {
    const where: Prisma.CustomerWhereInput = {
      establishmentId,
      deletedAt: null,
      ...(params.search
        ? {
            OR: [
              { firstName: { contains: params.search, mode: "insensitive" } },
              { lastName: { contains: params.search, mode: "insensitive" } },
              { phone: { contains: params.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        orderBy: { firstName: "asc" },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      this.prisma.customer.count({ where }),
    ]);
    return { items, total };
  }

  findById(establishmentId: string, id: string) {
    return this.prisma.customer.findFirst({
      where: { id, establishmentId, deletedAt: null },
    });
  }

  create(establishmentId: string, data: CustomerData) {
    return this.prisma.customer.create({ data: { ...data, establishmentId } });
  }

  update(id: string, data: Partial<CustomerData> & { isActive?: boolean }) {
    return this.prisma.customer.update({ where: { id }, data });
  }

  softDelete(id: string) {
    return this.prisma.customer.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  // Historique d'achats : seules les commandes soldées (PAID) comptent
  // comme un achat réel — une commande annulée ou encore ouverte n'en est
  // pas un.
  findPaidOrders(establishmentId: string, customerId: string) {
    return this.prisma.order.findMany({
      where: { establishmentId, customerId, status: "PAID" },
      include: {
        items: { include: { product: { select: { id: true, name: true } } } },
      },
      orderBy: { closedAt: "desc" },
    });
  }

  // 1 point de fidélité par 100 unités monétaires dépensées.
  creditLoyalty(db: Db, customerId: string, amountSpent: number) {
    return db.customer.update({
      where: { id: customerId },
      data: {
        totalSpent: { increment: amountSpent },
        loyaltyPoints: { increment: Math.floor(amountSpent / 100) },
      },
    });
  }
}
