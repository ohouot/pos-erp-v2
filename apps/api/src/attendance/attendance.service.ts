import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { AttendanceRepository } from "./attendance.repository.js";
import { enrichWithEmployee } from "../common/utils/enrich-employee.util.js";
import type { AttendanceActionDto } from "./dto/attendance-action.dto.js";
import type { ListAttendanceQueryDto } from "./dto/list-attendance-query.dto.js";

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly attendanceRepository: AttendanceRepository,
  ) {}

  async checkIn(
    establishmentId: string,
    employeeId: string,
    input: AttendanceActionDto,
  ) {
    const existing = await this.attendanceRepository.findToday(
      establishmentId,
      employeeId,
    );
    if (existing?.checkIn) {
      throw new BadRequestException("Présence déjà pointée aujourd'hui");
    }
    const attendance = await this.attendanceRepository.checkIn(
      establishmentId,
      employeeId,
      input.notes,
    );
    const [enriched] = await enrichWithEmployee(this.prisma, [attendance]);
    return enriched;
  }

  async checkOut(
    establishmentId: string,
    employeeId: string,
    input: AttendanceActionDto,
  ) {
    const existing = await this.attendanceRepository.findToday(
      establishmentId,
      employeeId,
    );
    if (!existing?.checkIn) {
      throw new BadRequestException("Aucun pointage d'arrivée aujourd'hui");
    }
    if (existing.checkOut) {
      throw new BadRequestException("Départ déjà pointé aujourd'hui");
    }
    const attendance = await this.attendanceRepository.checkOut(
      existing.id,
      input.notes,
    );
    const [enriched] = await enrichWithEmployee(this.prisma, [attendance]);
    return enriched;
  }

  async list(establishmentId: string, query: ListAttendanceQueryDto) {
    const rows = await this.attendanceRepository.findAll(establishmentId, {
      employeeId: query.employeeId,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    });
    return enrichWithEmployee(this.prisma, rows);
  }
}
