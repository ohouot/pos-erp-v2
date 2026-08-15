import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { WorkShiftsRepository } from "./work-shifts.repository.js";
import { EmployeesRepository } from "../employees/employees.repository.js";
import { enrichWithEmployee } from "../common/utils/enrich-employee.util.js";
import type { CreateWorkShiftDto } from "./dto/create-work-shift.dto.js";
import type { ListWorkShiftsQueryDto } from "./dto/list-work-shifts-query.dto.js";

@Injectable()
export class WorkShiftsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workShiftsRepository: WorkShiftsRepository,
    private readonly employeesRepository: EmployeesRepository,
  ) {}

  async create(establishmentId: string, input: CreateWorkShiftDto) {
    const membership = await this.employeesRepository.findMembership(
      input.employeeId,
      establishmentId,
    );
    if (!membership) {
      throw new BadRequestException(
        "Cet employé n'appartient pas à cet établissement",
      );
    }
    const startTime = new Date(input.startTime);
    const endTime = new Date(input.endTime);
    if (endTime <= startTime) {
      throw new BadRequestException(
        "L'heure de fin doit être après l'heure de début",
      );
    }
    // Aucune détection de chevauchement (fidèle au projet de référence) : un
    // même employé peut avoir deux créneaux qui se recouvrent.
    const shift = await this.workShiftsRepository.createShift(establishmentId, {
      employeeId: input.employeeId,
      startTime,
      endTime,
      role: input.role,
      notes: input.notes,
    });
    const [enriched] = await enrichWithEmployee(this.prisma, [shift]);
    return enriched;
  }

  async list(establishmentId: string, query: ListWorkShiftsQueryDto) {
    const shifts = await this.workShiftsRepository.findAll(establishmentId, {
      employeeId: query.employeeId,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    });
    return enrichWithEmployee(this.prisma, shifts);
  }

  async remove(establishmentId: string, id: string): Promise<void> {
    const shift = await this.workShiftsRepository.findById(establishmentId, id);
    if (!shift) throw new NotFoundException("Créneau introuvable");
    await this.workShiftsRepository.deleteShift(id);
  }
}
