import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class ExpenseCategoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAllForEstablishment(establishmentId: string) {
    return this.prisma.expenseCategory.findMany({
      where: { establishmentId },
      orderBy: { name: "asc" },
    });
  }

  findById(establishmentId: string, id: string) {
    return this.prisma.expenseCategory.findFirst({
      where: { id, establishmentId },
    });
  }

  findByName(establishmentId: string, name: string) {
    return this.prisma.expenseCategory.findFirst({
      where: { establishmentId, name },
    });
  }

  create(establishmentId: string, name: string) {
    return this.prisma.expenseCategory.create({
      data: { establishmentId, name },
    });
  }

  update(id: string, name: string) {
    return this.prisma.expenseCategory.update({
      where: { id },
      data: { name },
    });
  }

  countExpenses(id: string): Promise<number> {
    return this.prisma.expense.count({ where: { categoryId: id } });
  }

  remove(id: string) {
    return this.prisma.expenseCategory.delete({ where: { id } });
  }
}
