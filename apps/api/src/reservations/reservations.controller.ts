import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ReservationsService } from "./reservations.service.js";
import { EstablishmentGuard } from "../common/guards/establishment.guard.js";
import { CurrentEstablishmentId } from "../common/decorators/current-establishment-id.decorator.js";
import { RequirePermission } from "../common/decorators/require-permission.decorator.js";
import { CreateReservationDto } from "./dto/create-reservation.dto.js";
import { UpdateReservationDto } from "./dto/update-reservation.dto.js";
import { ListReservationsQueryDto } from "./dto/list-reservations-query.dto.js";

@Controller("reservations")
@UseGuards(EstablishmentGuard)
@RequirePermission("reservations:read")
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Get()
  async list(
    @CurrentEstablishmentId() establishmentId: string,
    @Query() query: ListReservationsQueryDto,
  ) {
    const { items, total } = await this.reservationsService.list(
      establishmentId,
      {
        page: query.page ?? 1,
        pageSize: query.pageSize ?? 20,
        status: query.status,
        tableId: query.tableId,
        from: query.from ? new Date(query.from) : undefined,
        to: query.to ? new Date(query.to) : undefined,
      },
    );
    const pageSize = query.pageSize ?? 20;
    return {
      reservations: items,
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
    return {
      reservation: await this.reservationsService.get(establishmentId, id),
    };
  }

  @Post()
  @RequirePermission("reservations:create")
  async create(
    @CurrentEstablishmentId() establishmentId: string,
    @Body() body: CreateReservationDto,
  ) {
    return {
      reservation: await this.reservationsService.create(establishmentId, body),
    };
  }

  @Patch(":id")
  @RequirePermission("reservations:update")
  async update(
    @CurrentEstablishmentId() establishmentId: string,
    @Param("id") id: string,
    @Body() body: UpdateReservationDto,
  ) {
    return {
      reservation: await this.reservationsService.update(
        establishmentId,
        id,
        body,
      ),
    };
  }

  @Post(":id/confirm")
  @RequirePermission("reservations:update")
  async confirm(
    @CurrentEstablishmentId() establishmentId: string,
    @Param("id") id: string,
  ) {
    return {
      reservation: await this.reservationsService.confirm(establishmentId, id),
    };
  }

  @Post(":id/complete")
  @RequirePermission("reservations:update")
  async complete(
    @CurrentEstablishmentId() establishmentId: string,
    @Param("id") id: string,
  ) {
    return {
      reservation: await this.reservationsService.complete(establishmentId, id),
    };
  }

  @Post(":id/no-show")
  @RequirePermission("reservations:update")
  async noShow(
    @CurrentEstablishmentId() establishmentId: string,
    @Param("id") id: string,
  ) {
    return {
      reservation: await this.reservationsService.markNoShow(
        establishmentId,
        id,
      ),
    };
  }

  @Post(":id/cancel")
  @RequirePermission("reservations:cancel")
  async cancel(
    @CurrentEstablishmentId() establishmentId: string,
    @Param("id") id: string,
  ) {
    return {
      reservation: await this.reservationsService.cancel(establishmentId, id),
    };
  }
}
