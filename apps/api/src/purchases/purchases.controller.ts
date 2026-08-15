import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { PurchasesService } from "./purchases.service.js";
import { AuditService } from "../audit/audit.service.js";
import { EstablishmentGuard } from "../common/guards/establishment.guard.js";
import { CurrentEstablishmentId } from "../common/decorators/current-establishment-id.decorator.js";
import { CurrentUser } from "../common/decorators/current-user.decorator.js";
import { RequirePermission } from "../common/decorators/require-permission.decorator.js";
import type { AuthenticatedUser } from "@pos-erp-v2/shared";
import { CreatePurchaseDto } from "./dto/create-purchase.dto.js";
import { UpdatePurchaseDto } from "./dto/update-purchase.dto.js";
import { ListPurchasesQueryDto } from "./dto/list-purchases-query.dto.js";

@Controller("purchases")
@UseGuards(EstablishmentGuard)
export class PurchasesController {
  constructor(
    private readonly purchasesService: PurchasesService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  async list(
    @CurrentEstablishmentId() establishmentId: string,
    @Query() query: ListPurchasesQueryDto,
  ) {
    const { items, total } = await this.purchasesService.list(establishmentId, {
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
      status: query.status,
      supplierId: query.supplierId,
    });
    const pageSize = query.pageSize ?? 20;
    return {
      purchases: items,
      meta: {
        page: query.page ?? 1,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  @Post()
  @RequirePermission("purchases:create")
  async create(
    @CurrentEstablishmentId() establishmentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreatePurchaseDto,
  ) {
    return {
      purchase: await this.purchasesService.create(
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
    return { purchase: await this.purchasesService.get(establishmentId, id) };
  }

  @Patch(":id")
  @RequirePermission("purchases:create")
  async update(
    @CurrentEstablishmentId() establishmentId: string,
    @Param("id") id: string,
    @Body() body: UpdatePurchaseDto,
  ) {
    return {
      purchase: await this.purchasesService.update(establishmentId, id, body),
    };
  }

  @Post(":id/validate")
  @RequirePermission("purchases:validate")
  async validate(
    @CurrentEstablishmentId() establishmentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    const purchase = await this.purchasesService.validate(
      establishmentId,
      id,
      user.id,
    );
    this.auditService.record({
      establishmentId,
      userId: user.id,
      action: "PURCHASE_VALIDATED",
      entityType: "Purchase",
      entityId: id,
    });
    return { purchase };
  }

  @Post(":id/cancel")
  @RequirePermission("purchases:cancel")
  async cancel(
    @CurrentEstablishmentId() establishmentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    const purchase = await this.purchasesService.cancel(establishmentId, id);
    this.auditService.record({
      establishmentId,
      userId: user.id,
      action: "PURCHASE_CANCELLED",
      entityType: "Purchase",
      entityId: id,
    });
    return { purchase };
  }
}
