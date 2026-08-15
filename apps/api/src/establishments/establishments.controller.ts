import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { EstablishmentsService } from "./establishments.service.js";
import { AuditService } from "../audit/audit.service.js";
import { CurrentUser } from "../common/decorators/current-user.decorator.js";
import { RequirePermission } from "../common/decorators/require-permission.decorator.js";
import type { AuthenticatedUser } from "@pos-erp-v2/shared";
import { CreateEstablishmentDto } from "./dto/create-establishment.dto.js";
import { UpdateEstablishmentDto } from "./dto/update-establishment.dto.js";

@Controller("establishments")
export class EstablishmentsController {
  constructor(
    private readonly establishmentsService: EstablishmentsService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    return {
      establishments:
        await this.establishmentsService.listAccessibleEstablishments(user),
    };
  }

  @Post()
  @RequirePermission("establishments:create")
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateEstablishmentDto,
  ) {
    const establishment = await this.establishmentsService.createEstablishment(
      user,
      body,
    );
    this.auditService.record({
      establishmentId: establishment.id,
      userId: user.id,
      action: "ESTABLISHMENT_CREATED",
      entityType: "Establishment",
      entityId: establishment.id,
    });
    return { establishment };
  }

  @Get(":id")
  async getOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return {
      establishment: await this.establishmentsService.getEstablishment(
        user,
        id,
      ),
    };
  }

  @Patch(":id")
  @RequirePermission("establishments:update")
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() body: UpdateEstablishmentDto,
  ) {
    const establishment = await this.establishmentsService.updateEstablishment(
      user,
      id,
      body,
    );
    this.auditService.record({
      establishmentId: id,
      userId: user.id,
      action: "ESTABLISHMENT_UPDATED",
      entityType: "Establishment",
      entityId: id,
    });
    return { establishment };
  }

  @Post(":id/select")
  async select(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.establishmentsService.selectEstablishment(user, id);
  }
}
