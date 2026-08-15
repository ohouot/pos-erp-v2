import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service.js";

const auditLogInclude = {
  user: { select: { id: true, firstName: true, lastName: true, email: true } },
} satisfies Prisma.AuditLogInclude;

export interface AuditLogFilters {
  page: number;
  pageSize: number;
  userId?: string;
  action?: string;
  from?: Date;
  to?: Date;
}

@Injectable()
export class AuditRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllPaginated(establishmentId: string, params: AuditLogFilters) {
    const where: Prisma.AuditLogWhereInput = {
      // Inclut aussi les actions sans établissement (ex: LOGIN_SUCCESS, avant
      // toute sélection d'établissement) — un signal de sécurité pertinent
      // quel que soit l'établissement actif au moment de la consultation
      // (comportement assumé, fidèle au projet de référence).
      OR: [{ establishmentId }, { establishmentId: null }],
      ...(params.userId ? { userId: params.userId } : {}),
      ...(params.action ? { action: params.action } : {}),
      ...(params.from || params.to
        ? {
            createdAt: {
              ...(params.from ? { gte: params.from } : {}),
              ...(params.to ? { lte: params.to } : {}),
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: auditLogInclude,
        orderBy: { createdAt: "desc" },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, total };
  }

  // Alimente le filtre "Action" du front sans deviner la liste à l'avance —
  // les actions journalisées évoluent avec les modules audités.
  async findDistinctActions(establishmentId: string): Promise<string[]> {
    const rows = await this.prisma.auditLog.findMany({
      where: { OR: [{ establishmentId }, { establishmentId: null }] },
      distinct: ["action"],
      select: { action: true },
      orderBy: { action: "asc" },
    });
    return rows.map((row) => row.action);
  }
}
