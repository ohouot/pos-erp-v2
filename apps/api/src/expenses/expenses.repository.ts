import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service.js";

export interface ExpenseData {
  categoryId: string;
  amount: number;
  description?: string;
  expenseDate?: Date;
  receiptUrl?: string;
}

const expenseInclude = {
  category: { select: { id: true, name: true } },
} satisfies Prisma.ExpenseInclude;

@Injectable()
export class ExpensesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(establishmentId: string, employeeId: string, data: ExpenseData) {
    return this.prisma.expense.create({
      data: { ...data, establishmentId, employeeId },
      include: expenseInclude,
    });
  }

  findById(establishmentId: string, id: string) {
    return this.prisma.expense.findFirst({
      where: { id, establishmentId },
      include: expenseInclude,
    });
  }

  async findAllPaginated(
    establishmentId: string,
    params: {
      page: number;
      pageSize: number;
      categoryId?: string;
      from?: Date;
      to?: Date;
    },
  ) {
    const where: Prisma.ExpenseWhereInput = {
      establishmentId,
      ...(params.categoryId ? { categoryId: params.categoryId } : {}),
      ...(params.from || params.to
        ? {
            expenseDate: {
              ...(params.from ? { gte: params.from } : {}),
              ...(params.to ? { lte: params.to } : {}),
            },
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        include: expenseInclude,
        orderBy: { expenseDate: "desc" },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      this.prisma.expense.count({ where }),
    ]);
    return { items, total };
  }

  update(id: string, data: Partial<ExpenseData>) {
    return this.prisma.expense.update({
      where: { id },
      data,
      include: expenseInclude,
    });
  }

  remove(id: string) {
    return this.prisma.expense.delete({ where: { id } });
  }
}
