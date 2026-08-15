import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { ReservationStatus } from "@prisma/client";
import { ReservationsRepository } from "./reservations.repository.js";
import type { CreateReservationDto } from "./dto/create-reservation.dto.js";
import type { UpdateReservationDto } from "./dto/update-reservation.dto.js";

const EDITABLE_STATUSES: ReservationStatus[] = ["PENDING", "CONFIRMED"];

@Injectable()
export class ReservationsService {
  constructor(
    private readonly reservationsRepository: ReservationsRepository,
  ) {}

  private assertOrder(startTime: Date, endTime?: Date): void {
    if (endTime && endTime <= startTime) {
      throw new BadRequestException(
        "L'heure de fin doit être après l'heure de début",
      );
    }
  }

  private async assertNoOverlap(
    establishmentId: string,
    tableId: string | undefined,
    start: Date,
    end: Date,
    excludeId?: string,
  ) {
    if (!tableId) return;
    const overlapping = await this.reservationsRepository.findOverlapping(
      establishmentId,
      tableId,
      start,
      end,
      excludeId,
    );
    if (overlapping) {
      throw new ConflictException(
        "Cette table est déjà réservée sur ce créneau",
      );
    }
  }

  async create(establishmentId: string, input: CreateReservationDto) {
    const startTime = new Date(input.startTime);
    const endTime = input.endTime ? new Date(input.endTime) : undefined;
    this.assertOrder(startTime, endTime);
    await this.assertNoOverlap(
      establishmentId,
      input.tableId,
      startTime,
      endTime ?? new Date(startTime.getTime() + 2 * 60 * 60 * 1000),
    );
    return this.reservationsRepository.create(establishmentId, {
      ...input,
      startTime,
      endTime,
    });
  }

  list(
    establishmentId: string,
    params: {
      page: number;
      pageSize: number;
      status?: ReservationStatus;
      tableId?: string;
      from?: Date;
      to?: Date;
    },
  ) {
    return this.reservationsRepository.findAllPaginated(
      establishmentId,
      params,
    );
  }

  private async findOrThrow(establishmentId: string, id: string) {
    const reservation = await this.reservationsRepository.findById(
      establishmentId,
      id,
    );
    if (!reservation) throw new NotFoundException("Réservation introuvable");
    return reservation;
  }

  get(establishmentId: string, id: string) {
    return this.findOrThrow(establishmentId, id);
  }

  private assertEditable(status: ReservationStatus): void {
    if (!EDITABLE_STATUSES.includes(status)) {
      throw new BadRequestException(
        "Cette réservation ne peut plus être modifiée",
      );
    }
  }

  async update(
    establishmentId: string,
    id: string,
    input: UpdateReservationDto,
  ) {
    const existing = await this.findOrThrow(establishmentId, id);
    this.assertEditable(existing.status);

    const startTime = input.startTime
      ? new Date(input.startTime)
      : existing.startTime;
    const endTime = input.endTime
      ? new Date(input.endTime)
      : (existing.endTime ?? undefined);
    this.assertOrder(startTime, endTime);
    const tableId =
      input.tableId !== undefined
        ? input.tableId
        : (existing.tableId ?? undefined);
    if (tableId && endTime) {
      await this.assertNoOverlap(
        establishmentId,
        tableId,
        startTime,
        endTime,
        id,
      );
    }

    return this.reservationsRepository.update(id, {
      ...input,
      startTime,
      endTime,
    });
  }

  async confirm(establishmentId: string, id: string) {
    const reservation = await this.findOrThrow(establishmentId, id);
    if (reservation.status !== "PENDING") {
      throw new BadRequestException(
        "Seule une réservation en attente peut être confirmée",
      );
    }
    return this.reservationsRepository.updateStatus(id, "CONFIRMED");
  }

  async complete(establishmentId: string, id: string) {
    const reservation = await this.findOrThrow(establishmentId, id);
    if (reservation.status !== "CONFIRMED") {
      throw new BadRequestException(
        "Seule une réservation confirmée peut être clôturée",
      );
    }
    return this.reservationsRepository.updateStatus(id, "COMPLETED");
  }

  async cancel(establishmentId: string, id: string) {
    const reservation = await this.findOrThrow(establishmentId, id);
    this.assertEditable(reservation.status);
    return this.reservationsRepository.updateStatus(id, "CANCELLED");
  }

  async markNoShow(establishmentId: string, id: string) {
    const reservation = await this.findOrThrow(establishmentId, id);
    this.assertEditable(reservation.status);
    return this.reservationsRepository.updateStatus(id, "NO_SHOW");
  }
}
