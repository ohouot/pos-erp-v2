import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class UnitsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Une unité système (establishmentId null) est partagée par tous les
  // établissements ; une unité créée par un établissement lui reste propre.
  findAllForEstablishment(establishmentId: string) {
    return this.prisma.unit.findMany({
      where: { OR: [{ establishmentId: null }, { establishmentId }] },
      orderBy: { name: "asc" },
    });
  }

  findById(id: string) {
    return this.prisma.unit.findUnique({ where: { id } });
  }

  create(establishmentId: string, data: { name: string; symbol: string }) {
    return this.prisma.unit.create({ data: { ...data, establishmentId } });
  }
}
