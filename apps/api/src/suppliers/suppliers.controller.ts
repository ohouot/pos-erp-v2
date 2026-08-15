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
import { SuppliersService } from "./suppliers.service.js";
import { EstablishmentGuard } from "../common/guards/establishment.guard.js";
import { CurrentEstablishmentId } from "../common/decorators/current-establishment-id.decorator.js";
import { RequirePermission } from "../common/decorators/require-permission.decorator.js";
import { CreateSupplierDto } from "./dto/create-supplier.dto.js";
import { UpdateSupplierDto } from "./dto/update-supplier.dto.js";

@Controller("suppliers")
@UseGuards(EstablishmentGuard)
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  async list(@CurrentEstablishmentId() establishmentId: string) {
    return { suppliers: await this.suppliersService.list(establishmentId) };
  }

  @Post()
  @RequirePermission("suppliers:create")
  async create(
    @CurrentEstablishmentId() establishmentId: string,
    @Body() body: CreateSupplierDto,
  ) {
    return {
      supplier: await this.suppliersService.create(establishmentId, body),
    };
  }

  @Patch(":id")
  @RequirePermission("suppliers:update")
  async update(
    @CurrentEstablishmentId() establishmentId: string,
    @Param("id") id: string,
    @Body() body: UpdateSupplierDto,
  ) {
    return {
      supplier: await this.suppliersService.update(establishmentId, id, body),
    };
  }

  @Delete(":id")
  @RequirePermission("suppliers:delete")
  @HttpCode(204)
  async remove(
    @CurrentEstablishmentId() establishmentId: string,
    @Param("id") id: string,
  ) {
    await this.suppliersService.remove(establishmentId, id);
  }
}
