import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class LocationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAllForEstablishment(establishmentId: string) {
    return this.prisma.location.findMany({
      where: { establishmentId, deletedAt: null },
      orderBy: { name: "asc" },
    });
  }

  findById(establishmentId: string, id: string) {
    return this.prisma.location.findFirst({
      where: { id, establishmentId, deletedAt: null },
    });
  }

  create(establishmentId: string, data: { name: string }) {
    return this.prisma.location.create({ data: { ...data, establishmentId } });
  }

  update(id: string, data: { name?: string; isActive?: boolean }) {
    return this.prisma.location.update({ where: { id }, data });
  }

  softDelete(id: string) {
    return this.prisma.location.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }
}
