import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

const roleWithPermissions = {
  select: {
    id: true,
    name: true,
    description: true,
    isSystem: true,
    permissions: { select: { permission: { select: { key: true } } } },
  },
} as const;

function flattenPermissions<
  T extends { permissions: { permission: { key: string } }[] },
>(role: T) {
  const { permissions, ...rest } = role;
  return { ...rest, permissions: permissions.map((p) => p.permission.key) };
}

@Injectable()
export class RolesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const roles = await this.prisma.role.findMany({
      ...roleWithPermissions,
      orderBy: { name: "asc" },
    });
    return roles.map(flattenPermissions);
  }

  async findById(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      ...roleWithPermissions,
    });
    return role ? flattenPermissions(role) : null;
  }

  findAllPermissions() {
    return this.prisma.permission.findMany({
      select: { id: true, key: true, module: true, description: true },
      orderBy: [{ module: "asc" }, { key: "asc" }],
    });
  }

  // Remplace intégralement l'ensemble des permissions d'un rôle plutôt que de
  // calculer un diff ajout/retrait — plus simple, sans risque d'état partiel.
  async replacePermissions(roleId: string, permissionKeys: string[]) {
    await this.prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId } });
      if (permissionKeys.length === 0) return;
      const permissions = await tx.permission.findMany({
        where: { key: { in: permissionKeys } },
        select: { id: true },
      });
      await tx.rolePermission.createMany({
        data: permissions.map((p) => ({ roleId, permissionId: p.id })),
        skipDuplicates: true,
      });
    });
    return this.findById(roleId);
  }
}
