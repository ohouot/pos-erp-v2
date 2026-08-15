import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AttendanceService } from "./attendance.service.js";
import { EstablishmentGuard } from "../common/guards/establishment.guard.js";
import { CurrentEstablishmentId } from "../common/decorators/current-establishment-id.decorator.js";
import { CurrentUser } from "../common/decorators/current-user.decorator.js";
import { RequirePermission } from "../common/decorators/require-permission.decorator.js";
import type { AuthenticatedUser } from "@pos-erp-v2/shared";
import { AttendanceActionDto } from "./dto/attendance-action.dto.js";
import { ListAttendanceQueryDto } from "./dto/list-attendance-query.dto.js";

@Controller("attendance")
@UseGuards(EstablishmentGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get()
  @RequirePermission("employees:read")
  async list(
    @CurrentEstablishmentId() establishmentId: string,
    @Query() query: ListAttendanceQueryDto,
  ) {
    return {
      attendance: await this.attendanceService.list(establishmentId, query),
    };
  }

  // Pointage en libre-service : tout membre authentifié de l'établissement
  // peut pointer sa propre arrivée/départ, sans permission RH spécifique
  // (fidèle au projet de référence) — l'employeeId vient toujours de
  // l'utilisateur authentifié, jamais du corps de la requête.
  @Post("check-in")
  async checkIn(
    @CurrentEstablishmentId() establishmentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: AttendanceActionDto,
  ) {
    return {
      attendance: await this.attendanceService.checkIn(
        establishmentId,
        user.id,
        body,
      ),
    };
  }

  @Post("check-out")
  @HttpCode(200)
  async checkOut(
    @CurrentEstablishmentId() establishmentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: AttendanceActionDto,
  ) {
    return {
      attendance: await this.attendanceService.checkOut(
        establishmentId,
        user.id,
        body,
      ),
    };
  }
}
