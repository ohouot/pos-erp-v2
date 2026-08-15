import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service.js";

export interface WorkShiftData {
  employeeId: string;
  startTime: Date;
  endTime: Date;
  role?: string;
  notes?: string;
}

@Injectable()
export class WorkShiftsRepository {
  constructor(private readonly prisma: PrismaService) {}

  createShift(establishmentId: string, input: WorkShiftData) {
    return this.prisma.workShift.create({
      data: { establishmentId, ...input },
    });
  }

  findAll(
    establishmentId: string,
    params: { employeeId?: string; from?: Date; to?: Date },
  ) {
    const where: Prisma.WorkShiftWhereInput = {
      establishmentId,
      ...(params.employeeId ? { employeeId: params.employeeId } : {}),
      ...(params.from || params.to
        ? {
            startTime: {
              ...(params.from ? { gte: params.from } : {}),
              ...(params.to ? { lte: params.to } : {}),
            },
          }
        : {}),
    };
    return this.prisma.workShift.findMany({
      where,
      orderBy: { startTime: "asc" },
    });
  }

  findById(establishmentId: string, id: string) {
    return this.prisma.workShift.findFirst({ where: { id, establishmentId } });
  }

  deleteShift(id: string) {
    return this.prisma.workShift.delete({ where: { id } });
  }
}
