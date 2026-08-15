import { Injectable } from "@nestjs/common";
import type { Prisma, PrismaClient, TableStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service.js";

export type Db = Prisma.TransactionClient | PrismaClient;

export interface TableData {
  name: string;
  capacity?: number;
  zone?: string;
  positionX?: number;
  positionY?: number;
  status?: TableStatus;
}

@Injectable()
export class TablesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAllForEstablishment(establishmentId: string) {
    return this.prisma.diningTable.findMany({
      where: { establishmentId },
      orderBy: { name: "asc" },
    });
  }

  findById(establishmentId: string, id: string) {
    return this.prisma.diningTable.findFirst({
      where: { id, establishmentId },
    });
  }

  create(establishmentId: string, data: TableData) {
    return this.prisma.diningTable.create({
      data: { ...data, establishmentId },
    });
  }

  update(id: string, data: Partial<TableData>) {
    return this.prisma.diningTable.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.diningTable.delete({ where: { id } });
  }

  // Une table sélectionnée pour une commande passe en OCCUPIED — appelé
  // depuis OrdersService.createOrder, dans la même transaction que la
  // commande. Après paiement, une table passe en CLEANING (pas FREE) :
  // desservie/nettoyée avant de redevenir disponible, geste manuel séparé.
  occupyTables(db: Db, tableIds: string[]) {
    if (tableIds.length === 0) return Promise.resolve();
    return db.diningTable.updateMany({
      where: { id: { in: tableIds } },
      data: { status: "OCCUPIED" },
    });
  }

  freeTables(db: Db, tableIds: string[]) {
    if (tableIds.length === 0) return Promise.resolve();
    return db.diningTable.updateMany({
      where: { id: { in: tableIds } },
      data: { status: "FREE" },
    });
  }

  markTablesCleaning(db: Db, tableIds: string[]) {
    if (tableIds.length === 0) return Promise.resolve();
    return db.diningTable.updateMany({
      where: { id: { in: tableIds } },
      data: { status: "CLEANING" },
    });
  }

  findManyByIds(db: Db, establishmentId: string, ids: string[]) {
    return db.diningTable.findMany({
      where: { id: { in: ids }, establishmentId },
    });
  }
}
