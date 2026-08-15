import { Injectable } from "@nestjs/common";
import { ALL_PERMISSIONS, type AuthenticatedUser } from "@pos-erp-v2/shared";
import type { Gender as PrismaGender } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service.js";

const membershipInclude = {
  where: { isActive: true },
  include: {
    establishment: { select: { id: true, name: true } },
    role: { include: { permissions: { include: { permission: true } } } },
  },
} as const;

type UserWithMemberships = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  gender: string | null;
  pinCodeHash: string | null;
  isSuperAdmin: boolean;
  memberships: Array<{
    establishment: { id: string; name: string };
    role: {
      id: string;
      name: string;
      permissions: Array<{ permission: { key: string } }>;
    };
  }>;
};

function toAuthenticatedUser(user: UserWithMemberships): AuthenticatedUser {
  const permissionSet = new Set<string>();
  const establishments: AuthenticatedUser["establishments"] = [];

  for (const membership of user.memberships) {
    establishments.push({
      establishmentId: membership.establishment.id,
      establishmentName: membership.establishment.name,
      roleId: membership.role.id,
      roleName: membership.role.name,
    });
    for (const rolePermission of membership.role.permissions) {
      permissionSet.add(rolePermission.permission.key);
    }
  }

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    gender: user.gender as AuthenticatedUser["gender"],
    hasPinCode: user.pinCodeHash != null,
    isSuperAdmin: user.isSuperAdmin,
    permissions: user.isSuperAdmin ? [...ALL_PERMISSIONS] : [...permissionSet],
    establishments,
  };
}

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAuthenticatedUserById(
    id: string,
  ): Promise<AuthenticatedUser | null> {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null, isActive: true },
      include: { memberships: membershipInclude },
    });
    return user ? toAuthenticatedUser(user) : null;
  }

  async emailExists(email: string, excludeUserId?: string): Promise<boolean> {
    const user = await this.prisma.user.findFirst({
      where: {
        email,
        deletedAt: null,
        ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      },
      select: { id: true },
    });
    return user !== null;
  }

  async updateProfile(
    userId: string,
    input: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      email?: string;
      avatarUrl?: string;
      gender?: string;
    },
  ): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { ...input, gender: input.gender as PrismaGender | undefined },
      include: { memberships: membershipInclude },
    });
    return toAuthenticatedUser(user);
  }

  async updatePinCodeHash(userId: string, pinCodeHash: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { pinCodeHash },
    });
  }

  async createUser(input: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    passwordHash: string;
    establishmentId?: string;
    roleId?: string;
  }): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        passwordHash: input.passwordHash,
        ...(input.establishmentId && input.roleId
          ? {
              memberships: {
                create: {
                  establishmentId: input.establishmentId,
                  roleId: input.roleId,
                },
              },
            }
          : {}),
      },
      include: { memberships: membershipInclude },
    });
    return toAuthenticatedUser(user);
  }

  findUserByEmail(email: string) {
    return this.prisma.user.findFirst({ where: { email, deletedAt: null } });
  }

  findUserById(id: string) {
    return this.prisma.user.findFirst({ where: { id, deletedAt: null } });
  }

  updateLastLoginAt(userId: string): Promise<unknown> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  updateUserPasswordHash(
    userId: string,
    passwordHash: string,
  ): Promise<unknown> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  markUserEmailVerified(userId: string): Promise<unknown> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date() },
    });
  }

  // Révoque toutes les sessions actives d'un utilisateur — appelé après un
  // changement de mot de passe (ici ou via /auth/reset-password), pour
  // qu'une session déjà ouverte ailleurs ne survive pas au changement.
  revokeAllUserRefreshTokens(userId: string): Promise<unknown> {
    return this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
