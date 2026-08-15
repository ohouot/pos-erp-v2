import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { InventoryService } from "./inventory.service.js";
import { AuditService } from "../audit/audit.service.js";
import { EstablishmentGuard } from "../common/guards/establishment.guard.js";
import { CurrentEstablishmentId } from "../common/decorators/current-establishment-id.decorator.js";
import { CurrentUser } from "../common/decorators/current-user.decorator.js";
import { RequirePermission } from "../common/decorators/require-permission.decorator.js";
import type { AuthenticatedUser } from "@pos-erp-v2/shared";
import { StartSessionDto } from "./dto/start-session.dto.js";
import { RecordItemDto } from "./dto/record-item.dto.js";
import { PaginationQueryDto } from "../common/dto/pagination-query.dto.js";

@Controller("inventory/sessions")
@UseGuards(EstablishmentGuard)
@RequirePermission("inventory:read")
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  async list(
    @CurrentEstablishmentId() establishmentId: string,
    @Query() query: PaginationQueryDto,
  ) {
    const { items, total } = await this.inventoryService.list(establishmentId, {
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
    });
    return {
      sessions: items,
      meta: {
        page: query.page ?? 1,
        pageSize: query.pageSize ?? 20,
        total,
        totalPages: Math.ceil(total / (query.pageSize ?? 20)),
      },
    };
  }

  @Post()
  @RequirePermission("inventory:session:start")
  async start(
    @CurrentEstablishmentId() establishmentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: StartSessionDto,
  ) {
    return {
      session: await this.inventoryService.startSession(
        establishmentId,
        user.id,
        body,
      ),
    };
  }

  @Get(":id")
  async get(
    @CurrentEstablishmentId() establishmentId: string,
    @Param("id") id: string,
  ) {
    return { session: await this.inventoryService.get(establishmentId, id) };
  }

  @Post(":id/items")
  @RequirePermission("inventory:adjust")
  async recordItem(
    @CurrentEstablishmentId() establishmentId: string,
    @Param("id") id: string,
    @Body() body: RecordItemDto,
  ) {
    return {
      item: await this.inventoryService.recordItem(establishmentId, id, body),
    };
  }

  @Delete(":id/items/:productId")
  @RequirePermission("inventory:adjust")
  async removeItem(
    @CurrentEstablishmentId() establishmentId: string,
    @Param("id") id: string,
    @Param("productId") productId: string,
  ) {
    await this.inventoryService.removeItem(establishmentId, id, productId);
  }

  @Post(":id/complete")
  @RequirePermission("inventory:session:complete")
  async complete(
    @CurrentEstablishmentId() establishmentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    const session = await this.inventoryService.completeSession(
      establishmentId,
      id,
      user.id,
    );
    this.auditService.record({
      establishmentId,
      userId: user.id,
      action: "INVENTORY_SESSION_COMPLETED",
      entityType: "InventorySession",
      entityId: id,
    });
    return { session };
  }

  @Post(":id/cancel")
  @RequirePermission("inventory:session:start")
  async cancel(
    @CurrentEstablishmentId() establishmentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    const session = await this.inventoryService.cancelSession(
      establishmentId,
      id,
    );
    this.auditService.record({
      establishmentId,
      userId: user.id,
      action: "INVENTORY_SESSION_CANCELLED",
      entityType: "InventorySession",
      entityId: id,
    });
    return { session };
  }
}
