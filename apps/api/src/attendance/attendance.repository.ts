import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service.js";

// Normalise sur minuit, heure locale du serveur (pas UTC) : Attendance a une
// contrainte d'unicité par établissement/employé/jour, un seul pointage
// arrivée+départ par jour — hérité tel quel du projet de référence (risque
// de fuseau horaire latent en cas de déploiement multi-fuseaux, non traité
// côté référence non plus).
function today(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

@Injectable()
export class AttendanceRepository {
  constructor(private readonly prisma: PrismaService) {}

  findToday(establishmentId: string, employeeId: string) {
    return this.prisma.attendance.findUnique({
      where: {
        establishmentId_employeeId_date: {
          establishmentId,
          employeeId,
          date: today(),
        },
      },
    });
  }

  checkIn(establishmentId: string, employeeId: string, notes?: string) {
    return this.prisma.attendance.upsert({
      where: {
        establishmentId_employeeId_date: {
          establishmentId,
          employeeId,
          date: today(),
        },
      },
      create: {
        establishmentId,
        employeeId,
        date: today(),
        checkIn: new Date(),
        notes,
      },
      update: { checkIn: new Date(), notes },
    });
  }

  checkOut(id: string, notes?: string) {
    return this.prisma.attendance.update({
      where: { id },
      data: { checkOut: new Date(), ...(notes !== undefined ? { notes } : {}) },
    });
  }

  findAll(
    establishmentId: string,
    params: { employeeId?: string; from?: Date; to?: Date },
  ) {
    const where: Prisma.AttendanceWhereInput = {
      establishmentId,
      ...(params.employeeId ? { employeeId: params.employeeId } : {}),
      ...(params.from || params.to
        ? {
            date: {
              ...(params.from ? { gte: params.from } : {}),
              ...(params.to ? { lte: params.to } : {}),
            },
          }
        : {}),
    };
    return this.prisma.attendance.findMany({
      where,
      orderBy: { date: "desc" },
    });
  }
}
