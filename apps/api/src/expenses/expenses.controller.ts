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
import { ExpensesService } from "./expenses.service.js";
import { AuditService } from "../audit/audit.service.js";
import { EstablishmentGuard } from "../common/guards/establishment.guard.js";
import { CurrentEstablishmentId } from "../common/decorators/current-establishment-id.decorator.js";
import { CurrentUser } from "../common/decorators/current-user.decorator.js";
import { RequirePermission } from "../common/decorators/require-permission.decorator.js";
import type { AuthenticatedUser } from "@pos-erp-v2/shared";
import { CreateExpenseDto } from "./dto/create-expense.dto.js";
import { UpdateExpenseDto } from "./dto/update-expense.dto.js";
import { ListExpensesQueryDto } from "./dto/list-expenses-query.dto.js";

@Controller("expenses")
@UseGuards(EstablishmentGuard)
@RequirePermission("expenses:read")
export class ExpensesController {
  constructor(
    private readonly expensesService: ExpensesService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  async list(
    @CurrentEstablishmentId() establishmentId: string,
    @Query() query: ListExpensesQueryDto,
  ) {
    const { items, total } = await this.expensesService.list(establishmentId, {
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
      categoryId: query.categoryId,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    });
    const pageSize = query.pageSize ?? 20;
    return {
      expenses: items,
      meta: {
        page: query.page ?? 1,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  @Get(":id")
  async get(
    @CurrentEstablishmentId() establishmentId: string,
    @Param("id") id: string,
  ) {
    return { expense: await this.expensesService.get(establishmentId, id) };
  }

  @Post()
  @RequirePermission("expenses:create")
  async create(
    @CurrentEstablishmentId() establishmentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateExpenseDto,
  ) {
    const expense = await this.expensesService.create(
      establishmentId,
      user.id,
      body,
    );
    this.auditService.record({
      establishmentId,
      userId: user.id,
      action: "EXPENSE_CREATED",
      entityType: "Expense",
      entityId: expense.id,
    });
    return { expense };
  }

  @Patch(":id")
  @RequirePermission("expenses:update")
  async update(
    @CurrentEstablishmentId() establishmentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() body: UpdateExpenseDto,
  ) {
    const expense = await this.expensesService.update(
      establishmentId,
      id,
      body,
    );
    this.auditService.record({
      establishmentId,
      userId: user.id,
      action: "EXPENSE_UPDATED",
      entityType: "Expense",
      entityId: id,
    });
    return { expense };
  }

  @Delete(":id")
  @RequirePermission("expenses:delete")
  @HttpCode(204)
  async remove(
    @CurrentEstablishmentId() establishmentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    await this.expensesService.remove(establishmentId, id);
    this.auditService.record({
      establishmentId,
      userId: user.id,
      action: "EXPENSE_DELETED",
      entityType: "Expense",
      entityId: id,
    });
  }
}
