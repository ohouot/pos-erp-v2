import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { EmployeesRepository } from "./employees.repository.js";
import { RolesRepository } from "../roles/roles.repository.js";
import {
  hashPassword,
  generateTemporaryPassword,
} from "../common/utils/password.util.js";
import type { CreateEmployeeDto } from "./dto/create-employee.dto.js";
import type { UpdateEmployeeDto } from "./dto/update-employee.dto.js";

function translatePrismaError(err: unknown): never {
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2002"
  ) {
    throw new ConflictException("Ce code vendeur est déjà utilisé");
  }
  throw err;
}

@Injectable()
export class EmployeesService {
  constructor(
    private readonly employeesRepository: EmployeesRepository,
    private readonly rolesRepository: RolesRepository,
  ) {}

  private async assertRoleExists(roleId: string | undefined): Promise<void> {
    if (!roleId) return;
    const roles = await this.rolesRepository.findAll();
    if (!roles.some((role) => role.id === roleId)) {
      throw new BadRequestException("Rôle introuvable");
    }
  }

  list(establishmentId: string) {
    return this.employeesRepository.findAllForEstablishment(establishmentId);
  }

  private async findOrThrow(establishmentId: string, id: string) {
    const employee = await this.employeesRepository.findById(
      establishmentId,
      id,
    );
    if (!employee) throw new NotFoundException("Employé introuvable");
    return employee;
  }

  get(establishmentId: string, id: string) {
    return this.findOrThrow(establishmentId, id);
  }

  // Rattache une personne à l'établissement en tant qu'employé : crée un
  // nouveau compte utilisateur (avec mot de passe temporaire, communiqué une
  // seule fois) si l'email est inconnu, ou rattache simplement le compte
  // existant s'il n'est pas déjà membre de cet établissement.
  async create(establishmentId: string, input: CreateEmployeeDto) {
    await this.assertRoleExists(input.roleId);

    const data = {
      ...input,
      hireDate: input.hireDate ? new Date(input.hireDate) : undefined,
    };

    const existingUser = await this.employeesRepository.findUserByEmail(
      input.email,
    );
    if (!existingUser) {
      const temporaryPassword = generateTemporaryPassword();
      const passwordHash = await hashPassword(temporaryPassword);
      const employee = await this.employeesRepository
        .createEmployeeWithNewUser(establishmentId, data, passwordHash)
        .catch(translatePrismaError);
      return { employee, temporaryPassword };
    }

    const existingMembership = await this.employeesRepository.findMembership(
      existingUser.id,
      establishmentId,
    );
    if (existingMembership) {
      throw new ConflictException(
        "Cette personne est déjà employée dans cet établissement",
      );
    }
    const employee = await this.employeesRepository
      .attachEmployeeToExistingUser(establishmentId, existingUser.id, data)
      .catch(translatePrismaError);
    return { employee, temporaryPassword: null };
  }

  async update(establishmentId: string, id: string, input: UpdateEmployeeDto) {
    await this.findOrThrow(establishmentId, id);
    await this.assertRoleExists(input.roleId);
    return this.employeesRepository
      .updateEmployee(id, establishmentId, {
        ...input,
        hireDate: input.hireDate ? new Date(input.hireDate) : undefined,
      })
      .catch(translatePrismaError);
  }
}
