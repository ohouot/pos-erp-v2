import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { UnitsService } from "./units.service.js";
import { EstablishmentGuard } from "../common/guards/establishment.guard.js";
import { CurrentEstablishmentId } from "../common/decorators/current-establishment-id.decorator.js";
import { RequirePermission } from "../common/decorators/require-permission.decorator.js";
import { CreateUnitDto } from "./dto/create-unit.dto.js";

@Controller("units")
@UseGuards(EstablishmentGuard)
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Get()
  async list(@CurrentEstablishmentId() establishmentId: string) {
    return { units: await this.unitsService.list(establishmentId) };
  }

  @Post()
  // Réutilise products:create — aucune permission dédiée units:* dans le
  // projet de référence (voir brief Lot 3).
  @RequirePermission("products:create")
  async create(
    @CurrentEstablishmentId() establishmentId: string,
    @Body() body: CreateUnitDto,
  ) {
    return { unit: await this.unitsService.create(establishmentId, body) };
  }
}
