import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

export interface SupplierData {
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

@Injectable()
export class SuppliersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAllForEstablishment(establishmentId: string) {
    return this.prisma.supplier.findMany({
      where: { establishmentId, deletedAt: null },
      orderBy: { name: "asc" },
    });
  }

  findById(establishmentId: string, id: string) {
    return this.prisma.supplier.findFirst({
      where: { id, establishmentId, deletedAt: null },
    });
  }

  create(establishmentId: string, data: SupplierData) {
    return this.prisma.supplier.create({ data: { ...data, establishmentId } });
  }

  update(id: string, data: Partial<SupplierData> & { isActive?: boolean }) {
    return this.prisma.supplier.update({ where: { id }, data });
  }

  softDelete(id: string) {
    return this.prisma.supplier.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }
}
