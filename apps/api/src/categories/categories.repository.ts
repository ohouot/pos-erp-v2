import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

export interface CategoryData {
  name: string;
  description?: string;
  imageUrl?: string;
  color?: string;
  parentId?: string;
}

@Injectable()
export class CategoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAllForEstablishment(establishmentId: string) {
    return this.prisma.category.findMany({
      where: { establishmentId, deletedAt: null },
      orderBy: { name: "asc" },
    });
  }

  findById(establishmentId: string, id: string) {
    return this.prisma.category.findFirst({
      where: { id, establishmentId, deletedAt: null },
    });
  }

  create(establishmentId: string, data: CategoryData) {
    return this.prisma.category.create({ data: { ...data, establishmentId } });
  }

  update(id: string, data: Partial<CategoryData> & { isActive?: boolean }) {
    return this.prisma.category.update({ where: { id }, data });
  }

  softDelete(id: string) {
    return this.prisma.category.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }
}
