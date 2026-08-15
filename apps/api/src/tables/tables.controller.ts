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
import { TablesService } from "./tables.service.js";
import { EstablishmentGuard } from "../common/guards/establishment.guard.js";
import { CurrentEstablishmentId } from "../common/decorators/current-establishment-id.decorator.js";
import { RequirePermission } from "../common/decorators/require-permission.decorator.js";
import { CreateTableDto } from "./dto/create-table.dto.js";
import { UpdateTableDto } from "./dto/update-table.dto.js";

@Controller("tables")
@UseGuards(EstablishmentGuard)
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Get()
  async list(@CurrentEstablishmentId() establishmentId: string) {
    return { tables: await this.tablesService.list(establishmentId) };
  }

  @Post()
  @RequirePermission("tables:manage")
  async create(
    @CurrentEstablishmentId() establishmentId: string,
    @Body() body: CreateTableDto,
  ) {
    return { table: await this.tablesService.create(establishmentId, body) };
  }

  @Patch(":id")
  @RequirePermission("tables:manage")
  async update(
    @CurrentEstablishmentId() establishmentId: string,
    @Param("id") id: string,
    @Body() body: UpdateTableDto,
  ) {
    return {
      table: await this.tablesService.update(establishmentId, id, body),
    };
  }

  @Delete(":id")
  @RequirePermission("tables:manage")
  @HttpCode(204)
  async remove(
    @CurrentEstablishmentId() establishmentId: string,
    @Param("id") id: string,
  ) {
    await this.tablesService.remove(establishmentId, id);
  }
}
