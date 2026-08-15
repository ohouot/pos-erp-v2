import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service.js";

const employeeInclude = {
  user: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      avatarUrl: true,
    },
  },
  role: { select: { id: true, name: true } },
  employeeProfile: true,
} satisfies Prisma.UserEstablishmentInclude;

type EmployeeWithRelations = Prisma.UserEstablishmentGetPayload<{
  include: typeof employeeInclude;
}>;

// Un "employé" est une relation UserEstablishment (le lien personne <->
// établissement <-> rôle) enrichie de son profil RH optionnel — pas une
// table dédiée, pour rester cohérent avec le modèle multi-établissement déjà
// en place (une même personne peut être membre de plusieurs établissements
// avec des rôles différents). `id` ci-dessous est celui de CETTE relation ;
// `userId` est celui du compte — c'est ce dernier qu'attendent WorkShift et
// Attendance (leur colonne `employeeId` est un scalaire simple pointant vers
// User.id, sans relation Prisma — voir work-shifts/attendance repositories).
function reshape(membership: EmployeeWithRelations) {
  const { user, role, employeeProfile, ...rest } = membership;
  return {
    id: rest.id,
    userId: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    isActive: rest.isActive,
    role,
    vendorCode: employeeProfile?.vendorCode ?? null,
    position: employeeProfile?.position ?? null,
    salary: employeeProfile?.salary ?? null,
    hireDate: employeeProfile?.hireDate ?? null,
    contractType: employeeProfile?.contractType ?? null,
    notes: employeeProfile?.notes ?? null,
    createdAt: rest.createdAt,
  };
}

export interface CreateEmployeeData {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  roleId: string;
  vendorCode?: string;
  position?: string;
  salary?: number;
  hireDate?: Date;
  contractType?: string;
  notes?: string;
}

export interface UpdateEmployeeData {
  roleId?: string;
  isActive?: boolean;
  vendorCode?: string;
  position?: string;
  salary?: number;
  hireDate?: Date;
  contractType?: string;
  notes?: string;
}

@Injectable()
export class EmployeesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllForEstablishment(establishmentId: string) {
    const rows = await this.prisma.userEstablishment.findMany({
      where: { establishmentId },
      include: employeeInclude,
      orderBy: { createdAt: "desc" },
    });
    return rows.map(reshape);
  }

  async findById(establishmentId: string, id: string) {
    const membership = await this.prisma.userEstablishment.findFirst({
      where: { id, establishmentId },
      include: employeeInclude,
    });
    return membership ? reshape(membership) : null;
  }

  findUserByEmail(email: string) {
    return this.prisma.user.findFirst({ where: { email, deletedAt: null } });
  }

  // Utilisé aussi par WorkShiftsService/AttendanceService pour vérifier
  // qu'un `employeeId` (= userId) reçu correspond bien à un membre actif de
  // l'établissement avant de créer un créneau/pointage.
  findMembership(userId: string, establishmentId: string) {
    return this.prisma.userEstablishment.findUnique({
      where: { userId_establishmentId: { userId, establishmentId } },
    });
  }

  async createEmployeeWithNewUser(
    establishmentId: string,
    input: CreateEmployeeData,
    passwordHash: string,
  ) {
    const {
      email,
      firstName,
      lastName,
      phone,
      roleId,
      vendorCode,
      position,
      salary,
      hireDate,
      contractType,
      notes,
    } = input;
    const membership = await this.prisma.userEstablishment.create({
      data: {
        establishment: { connect: { id: establishmentId } },
        role: { connect: { id: roleId } },
        user: { create: { email, firstName, lastName, phone, passwordHash } },
        employeeProfile: {
          create: {
            establishmentId,
            vendorCode,
            position,
            salary,
            hireDate,
            contractType,
            notes,
          },
        },
      },
      include: employeeInclude,
    });
    return reshape(membership);
  }

  async attachEmployeeToExistingUser(
    establishmentId: string,
    userId: string,
    input: CreateEmployeeData,
  ) {
    const {
      roleId,
      vendorCode,
      position,
      salary,
      hireDate,
      contractType,
      notes,
    } = input;
    const membership = await this.prisma.userEstablishment.create({
      data: {
        establishmentId,
        roleId,
        userId,
        employeeProfile: {
          create: {
            establishmentId,
            vendorCode,
            position,
            salary,
            hireDate,
            contractType,
            notes,
          },
        },
      },
      include: employeeInclude,
    });
    return reshape(membership);
  }

  async updateEmployee(
    id: string,
    establishmentId: string,
    input: UpdateEmployeeData,
  ) {
    const {
      roleId,
      isActive,
      vendorCode,
      position,
      salary,
      hireDate,
      contractType,
      notes,
    } = input;
    const hasProfileFields =
      vendorCode !== undefined ||
      position !== undefined ||
      salary !== undefined ||
      hireDate !== undefined ||
      contractType !== undefined ||
      notes !== undefined;

    const membership = await this.prisma.userEstablishment.update({
      where: { id },
      data: {
        ...(roleId ? { roleId } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
        ...(hasProfileFields
          ? {
              employeeProfile: {
                upsert: {
                  create: {
                    establishmentId,
                    vendorCode,
                    position,
                    salary,
                    hireDate,
                    contractType,
                    notes,
                  },
                  update: {
                    vendorCode,
                    position,
                    salary,
                    hireDate,
                    contractType,
                    notes,
                  },
                },
              },
            }
          : {}),
      },
      include: employeeInclude,
    });
    return reshape(membership);
  }
}
