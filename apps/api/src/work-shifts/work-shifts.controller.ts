import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { WorkShiftsService } from "./work-shifts.service.js";
import { EstablishmentGuard } from "../common/guards/establishment.guard.js";
import { CurrentEstablishmentId } from "../common/decorators/current-establishment-id.decorator.js";
import { RequirePermission } from "../common/decorators/require-permission.decorator.js";
import { CreateWorkShiftDto } from "./dto/create-work-shift.dto.js";
import { ListWorkShiftsQueryDto } from "./dto/list-work-shifts-query.dto.js";

// Pas de permission workShifts:* dédiée (fidèle au projet de référence) :
// réutilise employees:read/employees:update.
@Controller("work-shifts")
@UseGuards(EstablishmentGuard)
export class WorkShiftsController {
  constructor(private readonly workShiftsService: WorkShiftsService) {}

  @Get()
  @RequirePermission("employees:read")
  async list(
    @CurrentEstablishmentId() establishmentId: string,
    @Query() query: ListWorkShiftsQueryDto,
  ) {
    return {
      shifts: await this.workShiftsService.list(establishmentId, query),
    };
  }

  @Post()
  @RequirePermission("employees:update")
  async create(
    @CurrentEstablishmentId() establishmentId: string,
    @Body() body: CreateWorkShiftDto,
  ) {
    return {
      shift: await this.workShiftsService.create(establishmentId, body),
    };
  }

  @Delete(":id")
  @RequirePermission("employees:update")
  @HttpCode(204)
  async remove(
    @CurrentEstablishmentId() establishmentId: string,
    @Param("id") id: string,
  ) {
    await this.workShiftsService.remove(establishmentId, id);
  }
}
