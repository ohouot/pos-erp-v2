import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AuditRepository } from "./audit.repository.js";
import { EstablishmentGuard } from "../common/guards/establishment.guard.js";
import { CurrentEstablishmentId } from "../common/decorators/current-establishment-id.decorator.js";
import { RequirePermission } from "../common/decorators/require-permission.decorator.js";
import { ListAuditLogsQueryDto } from "./dto/list-audit-logs-query.dto.js";

// Préfixe réel "/audit-logs" (fidèle au montage du projet de référence, qui
// diffère du chemin mentionné dans ses propres commentaires OpenAPI).
@Controller("audit-logs")
@UseGuards(EstablishmentGuard)
@RequirePermission("audit:read")
export class AuditController {
  constructor(private readonly auditRepository: AuditRepository) {}

  @Get()
  async list(
    @CurrentEstablishmentId() establishmentId: string,
    @Query() query: ListAuditLogsQueryDto,
  ) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const { data, total } = await this.auditRepository.findAllPaginated(
      establishmentId,
      {
        page,
        pageSize,
        userId: query.userId,
        action: query.action,
        from: query.from ? new Date(query.from) : undefined,
        to: query.to ? new Date(query.to) : undefined,
      },
    );
    return {
      data,
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  @Get("actions")
  async listActions(@CurrentEstablishmentId() establishmentId: string) {
    return {
      actions: await this.auditRepository.findDistinctActions(establishmentId),
    };
  }
}
