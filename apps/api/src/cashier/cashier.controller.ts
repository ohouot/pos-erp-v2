import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CashierService } from "./cashier.service.js";
import { AuditService } from "../audit/audit.service.js";
import { EstablishmentGuard } from "../common/guards/establishment.guard.js";
import { CurrentEstablishmentId } from "../common/decorators/current-establishment-id.decorator.js";
import { CurrentUser } from "../common/decorators/current-user.decorator.js";
import { RequirePermission } from "../common/decorators/require-permission.decorator.js";
import type { AuthenticatedUser } from "@pos-erp-v2/shared";
import { PaginationQueryDto } from "../common/dto/pagination-query.dto.js";
import { OpenSessionDto } from "./dto/open-session.dto.js";
import { CashMovementDto } from "./dto/cash-movement.dto.js";
import { CloseSessionDto } from "./dto/close-session.dto.js";

@Controller("cashier/sessions")
@UseGuards(EstablishmentGuard)
@RequirePermission("cashier:read")
export class CashierController {
  constructor(
    private readonly cashierService: CashierService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  async list(
    @CurrentEstablishmentId() establishmentId: string,
    @Query() query: PaginationQueryDto,
  ) {
    const { items, total } = await this.cashierService.list(establishmentId, {
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
    });
    const pageSize = query.pageSize ?? 20;
    return {
      sessions: items,
      meta: {
        page: query.page ?? 1,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  @Get("current")
  async current(@CurrentEstablishmentId() establishmentId: string) {
    return { session: await this.cashierService.getCurrent(establishmentId) };
  }

  @Get(":id")
  async get(
    @CurrentEstablishmentId() establishmentId: string,
    @Param("id") id: string,
  ) {
    return { session: await this.cashierService.get(establishmentId, id) };
  }

  @Post()
  @RequirePermission("cashier:open")
  async open(
    @CurrentEstablishmentId() establishmentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: OpenSessionDto,
  ) {
    const session = await this.cashierService.openSession(
      establishmentId,
      user.id,
      body,
    );
    this.auditService.record({
      establishmentId,
      userId: user.id,
      action: "CASH_SESSION_OPENED",
      entityType: "CashSession",
      entityId: session.id,
    });
    return { session };
  }

  @Post(":id/deposit")
  @RequirePermission("cashier:deposit")
  async deposit(
    @CurrentEstablishmentId() establishmentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() body: CashMovementDto,
  ) {
    return {
      movement: await this.cashierService.deposit(
        establishmentId,
        id,
        user.id,
        body,
      ),
    };
  }

  @Post(":id/withdraw")
  @RequirePermission("cashier:withdraw")
  async withdraw(
    @CurrentEstablishmentId() establishmentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() body: CashMovementDto,
  ) {
    return {
      movement: await this.cashierService.withdraw(
        establishmentId,
        id,
        user.id,
        body,
      ),
    };
  }

  @Post(":id/close")
  @RequirePermission("cashier:close")
  async close(
    @CurrentEstablishmentId() establishmentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() body: CloseSessionDto,
  ) {
    const session = await this.cashierService.closeSession(
      establishmentId,
      id,
      body,
    );
    this.auditService.record({
      establishmentId,
      userId: user.id,
      action: "CASH_SESSION_CLOSED",
      entityType: "CashSession",
      entityId: id,
    });
    return { session };
  }
}
