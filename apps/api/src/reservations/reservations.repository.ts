import { Injectable } from "@nestjs/common";
import type { Prisma, ReservationStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service.js";

export interface ReservationData {
  customerId?: string;
  tableId?: string;
  startTime: Date;
  endTime?: Date;
  partySize?: number;
  notes?: string;
}

const reservationInclude = {
  customer: {
    select: { id: true, firstName: true, lastName: true, phone: true },
  },
  table: { select: { id: true, name: true } },
} satisfies Prisma.ReservationInclude;

// Colonne date-only dérivée de startTime — sert uniquement à l'index
// [establishmentId, reservationDate] pour les requêtes "réservations du
// jour", jamais fournie par le client.
function dateOnly(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

const DEFAULT_DURATION_MS = 2 * 60 * 60 * 1000;

@Injectable()
export class ReservationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(establishmentId: string, data: ReservationData) {
    const startTime = data.startTime;
    const endTime =
      data.endTime ?? new Date(startTime.getTime() + DEFAULT_DURATION_MS);
    return this.prisma.reservation.create({
      data: {
        establishmentId,
        customerId: data.customerId,
        tableId: data.tableId,
        startTime,
        endTime,
        reservationDate: dateOnly(startTime),
        partySize: data.partySize ?? 1,
        notes: data.notes,
      },
      include: reservationInclude,
    });
  }

  findById(establishmentId: string, id: string) {
    return this.prisma.reservation.findFirst({
      where: { id, establishmentId },
      include: reservationInclude,
    });
  }

  async findAllPaginated(
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
    const where: Prisma.ReservationWhereInput = {
      establishmentId,
      ...(params.status ? { status: params.status } : {}),
      ...(params.tableId ? { tableId: params.tableId } : {}),
      ...(params.from || params.to
        ? {
            startTime: {
              ...(params.from ? { gte: params.from } : {}),
              ...(params.to ? { lte: params.to } : {}),
            },
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.reservation.findMany({
        where,
        include: reservationInclude,
        orderBy: { startTime: "asc" },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      this.prisma.reservation.count({ where }),
    ]);
    return { items, total };
  }

  // Chevauchement : une autre réservation (non annulée/no-show) sur la même
  // table dont l'intervalle [startTime, endTime) recoupe celui demandé.
  findOverlapping(
    establishmentId: string,
    tableId: string,
    start: Date,
    end: Date,
    excludeId?: string,
  ) {
    return this.prisma.reservation.findFirst({
      where: {
        establishmentId,
        tableId,
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
        startTime: { lt: end },
        endTime: { gt: start },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
  }

  update(
    id: string,
    data: Partial<Omit<ReservationData, "startTime">> & { startTime?: Date },
  ) {
    return this.prisma.reservation.update({
      where: { id },
      data: {
        ...data,
        ...(data.startTime
          ? { reservationDate: dateOnly(data.startTime) }
          : {}),
      },
      include: reservationInclude,
    });
  }

  updateStatus(id: string, status: ReservationStatus) {
    return this.prisma.reservation.update({
      where: { id },
      data: { status },
      include: reservationInclude,
    });
  }
}
