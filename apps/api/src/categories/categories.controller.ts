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
import { CategoriesService } from "./categories.service.js";
import { EstablishmentGuard } from "../common/guards/establishment.guard.js";
import { CurrentEstablishmentId } from "../common/decorators/current-establishment-id.decorator.js";
import { RequirePermission } from "../common/decorators/require-permission.decorator.js";
import { CreateCategoryDto } from "./dto/create-category.dto.js";
import { UpdateCategoryDto } from "./dto/update-category.dto.js";

@Controller("categories")
@UseGuards(EstablishmentGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  async list(@CurrentEstablishmentId() establishmentId: string) {
    return { categories: await this.categoriesService.list(establishmentId) };
  }

  @Post()
  @RequirePermission("categories:create")
  async create(
    @CurrentEstablishmentId() establishmentId: string,
    @Body() body: CreateCategoryDto,
  ) {
    return {
      category: await this.categoriesService.create(establishmentId, body),
    };
  }

  @Patch(":id")
  @RequirePermission("categories:update")
  async update(
    @CurrentEstablishmentId() establishmentId: string,
    @Param("id") id: string,
    @Body() body: UpdateCategoryDto,
  ) {
    return {
      category: await this.categoriesService.update(establishmentId, id, body),
    };
  }

  @Delete(":id")
  @RequirePermission("categories:delete")
  @HttpCode(204)
  async remove(
    @CurrentEstablishmentId() establishmentId: string,
    @Param("id") id: string,
  ) {
    await this.categoriesService.remove(establishmentId, id);
  }
}
