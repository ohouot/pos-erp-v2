import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

export interface RecordAuditInput {
  establishmentId?: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string;
  userAgent?: string;
}

// Écriture d'audit fire-and-forget : ne doit jamais faire échouer le flux
// métier appelant (login, changement de permission...) si la journalisation
// elle-même échoue — voir apps/api/src/lib/audit.ts du projet de référence.
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  record(input: RecordAuditInput): void {
    this.prisma.auditLog
      .create({
        data: {
          establishmentId: input.establishmentId,
          userId: input.userId,
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId,
          oldValue: input.oldValue as never,
          newValue: input.newValue as never,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
        },
      })
      .catch((error: unknown) => {
        this.logger.error("Échec de l'écriture d'audit", error as Error);
      });
  }
}
