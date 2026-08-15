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
import { LocationsService } from "./locations.service.js";
import { EstablishmentGuard } from "../common/guards/establishment.guard.js";
import { CurrentEstablishmentId } from "../common/decorators/current-establishment-id.decorator.js";
import { RequirePermission } from "../common/decorators/require-permission.decorator.js";
import { CreateLocationDto } from "./dto/create-location.dto.js";
import { UpdateLocationDto } from "./dto/update-location.dto.js";

@Controller("locations")
@UseGuards(EstablishmentGuard)
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get()
  async list(@CurrentEstablishmentId() establishmentId: string) {
    return { locations: await this.locationsService.list(establishmentId) };
  }

  @Post()
  @RequirePermission("locations:create")
  async create(
    @CurrentEstablishmentId() establishmentId: string,
    @Body() body: CreateLocationDto,
  ) {
    return {
      location: await this.locationsService.create(establishmentId, body),
    };
  }

  @Patch(":id")
  @RequirePermission("locations:update")
  async update(
    @CurrentEstablishmentId() establishmentId: string,
    @Param("id") id: string,
    @Body() body: UpdateLocationDto,
  ) {
    return {
      location: await this.locationsService.update(establishmentId, id, body),
    };
  }

  @Delete(":id")
  @RequirePermission("locations:delete")
  @HttpCode(204)
  async remove(
    @CurrentEstablishmentId() establishmentId: string,
    @Param("id") id: string,
  ) {
    await this.locationsService.remove(establishmentId, id);
  }
}
