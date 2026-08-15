import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Put,
  UseGuards,
} from "@nestjs/common";
import { RecipesService } from "./recipes.service.js";
import { AuditService } from "../audit/audit.service.js";
import { EstablishmentGuard } from "../common/guards/establishment.guard.js";
import { CurrentEstablishmentId } from "../common/decorators/current-establishment-id.decorator.js";
import { CurrentUser } from "../common/decorators/current-user.decorator.js";
import { RequirePermission } from "../common/decorators/require-permission.decorator.js";
import type { AuthenticatedUser } from "@pos-erp-v2/shared";
import { UpsertRecipeDto } from "./dto/upsert-recipe.dto.js";

@Controller("products/:productId/recipe")
@UseGuards(EstablishmentGuard)
export class RecipesController {
  constructor(
    private readonly recipesService: RecipesService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  async get(
    @CurrentEstablishmentId() establishmentId: string,
    @Param("productId") productId: string,
  ) {
    return {
      recipe: await this.recipesService.get(establishmentId, productId),
    };
  }

  @Put()
  // Pas de permission recipes:* dédiée dans le projet de référence —
  // réutilise products:update, comme les unités d'emballage.
  @RequirePermission("products:update")
  async upsert(
    @CurrentEstablishmentId() establishmentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("productId") productId: string,
    @Body() body: UpsertRecipeDto,
  ) {
    const recipe = await this.recipesService.upsert(
      establishmentId,
      productId,
      body,
    );
    this.auditService.record({
      establishmentId,
      userId: user.id,
      action: "RECIPE_UPDATED",
      entityType: "Product",
      entityId: productId,
    });
    return { recipe };
  }

  @Delete()
  @RequirePermission("products:update")
  @HttpCode(204)
  async remove(
    @CurrentEstablishmentId() establishmentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("productId") productId: string,
  ) {
    await this.recipesService.remove(establishmentId, productId);
    this.auditService.record({
      establishmentId,
      userId: user.id,
      action: "RECIPE_DELETED",
      entityType: "Product",
      entityId: productId,
    });
  }
}
