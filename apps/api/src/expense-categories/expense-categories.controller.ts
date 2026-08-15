import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ExpenseCategoriesService } from "./expense-categories.service.js";
import { EstablishmentGuard } from "../common/guards/establishment.guard.js";
import { CurrentEstablishmentId } from "../common/decorators/current-establishment-id.decorator.js";
import { RequirePermission } from "../common/decorators/require-permission.decorator.js";
import { ExpenseCategoryDto } from "./dto/expense-category.dto.js";

// Réutilise les permissions expenses:* — pas d'espace de noms dédié dans le
// projet de référence (voir packages/shared/src/permissions.ts).
@Controller("expense-categories")
@UseGuards(EstablishmentGuard)
@RequirePermission("expenses:read")
export class ExpenseCategoriesController {
  constructor(
    private readonly expenseCategoriesService: ExpenseCategoriesService,
  ) {}

  @Get()
  async list(@CurrentEstablishmentId() establishmentId: string) {
    return {
      expenseCategories:
        await this.expenseCategoriesService.list(establishmentId),
    };
  }

  @Post()
  @RequirePermission("expenses:create")
  async create(
    @CurrentEstablishmentId() establishmentId: string,
    @Body() body: ExpenseCategoryDto,
  ) {
    return {
      expenseCategory: await this.expenseCategoriesService.create(
        establishmentId,
        body,
      ),
    };
  }

  @Patch(":id")
  @RequirePermission("expenses:update")
  async update(
    @CurrentEstablishmentId() establishmentId: string,
    @Param("id") id: string,
    @Body() body: ExpenseCategoryDto,
  ) {
    return {
      expenseCategory: await this.expenseCategoriesService.update(
        establishmentId,
        id,
        body,
      ),
    };
  }

  @Delete(":id")
  @RequirePermission("expenses:delete")
  @HttpCode(204)
  async remove(
    @CurrentEstablishmentId() establishmentId: string,
    @Param("id") id: string,
  ) {
    await this.expenseCategoriesService.remove(establishmentId, id);
  }
}
