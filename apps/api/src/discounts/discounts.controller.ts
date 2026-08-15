import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { DiscountsService } from "./discounts.service.js";
import { AuditService } from "../audit/audit.service.js";
import { EstablishmentGuard } from "../common/guards/establishment.guard.js";
import { CurrentEstablishmentId } from "../common/decorators/current-establishment-id.decorator.js";
import { CurrentUser } from "../common/decorators/current-user.decorator.js";
import { RequirePermission } from "../common/decorators/require-permission.decorator.js";
import type { AuthenticatedUser } from "@pos-erp-v2/shared";
import { CreateDiscountDto } from "./dto/create-discount.dto.js";
import { UpdateDiscountDto } from "./dto/update-discount.dto.js";

@Controller("discounts")
@UseGuards(EstablishmentGuard)
@RequirePermission("discounts:read")
export class DiscountsController {
  constructor(
    private readonly discountsService: DiscountsService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  async list(
    @CurrentEstablishmentId() establishmentId: string,
    @Query("active") active?: string,
  ) {
    return {
      discounts: await this.discountsService.list(
        establishmentId,
        active === "true",
      ),
    };
  }

  @Get(":id")
  async get(
    @CurrentEstablishmentId() establishmentId: string,
    @Param("id") id: string,
  ) {
    return { discount: await this.discountsService.get(establishmentId, id) };
  }

  @Post()
  @RequirePermission("discounts:create")
  async create(
    @CurrentEstablishmentId() establishmentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateDiscountDto,
  ) {
    const discount = await this.discountsService.create(establishmentId, body);
    this.auditService.record({
      establishmentId,
      userId: user.id,
      action: "DISCOUNT_CREATED",
      entityType: "Discount",
      entityId: discount.id,
    });
    return { discount };
  }

  @Patch(":id")
  @RequirePermission("discounts:update")
  async update(
    @CurrentEstablishmentId() establishmentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() body: UpdateDiscountDto,
  ) {
    const discount = await this.discountsService.update(
      establishmentId,
      id,
      body,
    );
    this.auditService.record({
      establishmentId,
      userId: user.id,
      action: "DISCOUNT_UPDATED",
      entityType: "Discount",
      entityId: id,
    });
    return { discount };
  }

  @Delete(":id")
  @RequirePermission("discounts:delete")
  @HttpCode(204)
  async remove(
    @CurrentEstablishmentId() establishmentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    await this.discountsService.remove(establishmentId, id);
    this.auditService.record({
      establishmentId,
      userId: user.id,
      action: "DISCOUNT_DELETED",
      entityType: "Discount",
      entityId: id,
    });
  }
}
