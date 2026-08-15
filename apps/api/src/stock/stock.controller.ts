import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { StockMovementsService } from "./stock-movements.service.js";
import { AuditService } from "../audit/audit.service.js";
import { EstablishmentGuard } from "../common/guards/establishment.guard.js";
import { CurrentEstablishmentId } from "../common/decorators/current-establishment-id.decorator.js";
import { CurrentUser } from "../common/decorators/current-user.decorator.js";
import { RequirePermission } from "../common/decorators/require-permission.decorator.js";
import type { AuthenticatedUser } from "@pos-erp-v2/shared";
import { ListMovementsQueryDto } from "./dto/list-movements-query.dto.js";
import { AdjustStockDto } from "./dto/adjust-stock.dto.js";

@Controller("stock")
@UseGuards(EstablishmentGuard)
@RequirePermission("inventory:read")
export class StockController {
  constructor(
    private readonly stockMovementsService: StockMovementsService,
    private readonly auditService: AuditService,
  ) {}

  @Get("movements")
  async listMovements(
    @CurrentEstablishmentId() establishmentId: string,
    @Query() query: ListMovementsQueryDto,
  ) {
    const { items, meta } = await this.stockMovementsService.listMovements(
      establishmentId,
      {
        page: query.page ?? 1,
        pageSize: query.pageSize ?? 20,
        productId: query.productId,
        type: query.type,
        from: query.from ? new Date(query.from) : undefined,
        to: query.to ? new Date(query.to) : undefined,
      },
    );
    return { movements: items, meta };
  }

  @Get("movements/export")
  async exportMovements(
    @CurrentEstablishmentId() establishmentId: string,
    @Query() query: ListMovementsQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const csv = await this.stockMovementsService.exportMovementsCsv(
      establishmentId,
      {
        productId: query.productId,
        type: query.type,
        from: query.from ? new Date(query.from) : undefined,
        to: query.to ? new Date(query.to) : undefined,
      },
    );
    res.set({
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="mouvements-stock.csv"',
    });
    return csv;
  }

  @Get("low-stock")
  async lowStock(@CurrentEstablishmentId() establishmentId: string) {
    return {
      products: await this.stockMovementsService.listLowStock(establishmentId),
    };
  }

  @Post("adjustments")
  @RequirePermission("inventory:adjust")
  async createAdjustment(
    @CurrentEstablishmentId() establishmentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: AdjustStockDto,
  ) {
    const movement = await this.stockMovementsService.createManualAdjustment(
      establishmentId,
      user.id,
      body,
    );
    this.auditService.record({
      establishmentId,
      userId: user.id,
      action: "STOCK_ADJUSTMENT_CREATED",
      entityType: "StockMovement",
      entityId: movement.id,
    });
    return { movement };
  }
}
