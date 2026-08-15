import { Injectable } from "@nestjs/common";
import type { EstablishmentType } from "@pos-erp-v2/shared";
import { PrismaService } from "../prisma/prisma.service.js";
import { EstablishmentsRepository } from "../establishments/establishments.repository.js";

@Injectable()
export class AuthRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly establishmentsRepository: EstablishmentsRepository,
  ) {}

  // Auto-inscription publique : crée le compte, son premier établissement, et
  // le rattachement RBAC en une seule transaction — sans les trois, le compte
  // serait créé mais inutilisable (les permissions ne viennent que des
  // lignes UserEstablishment, la simple propriété de l'établissement n'en
  // octroie aucune, voir UsersRepository.toAuthenticatedUser). Le rôle
  // "Administrateur" (tous droits sauf suppression de l'établissement, voir
  // packages/shared/src/permissions.ts) est le rôle système le plus proche
  // d'un propriétaire unique gérant seul son établissement.
  //
  // Dépend du seed (rôles système) ayant été exécuté avant le premier
  // enregistrement : sans la ligne Role "Administrateur", cette transaction
  // échoue entièrement (findUniqueOrThrow) plutôt que de créer un compte
  // techniquement présent mais bloqué à toutes les permissions.
  async registerAccount(input: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    passwordHash: string;
    establishmentName: string;
    establishmentType: EstablishmentType;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: input.email,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          passwordHash: input.passwordHash,
        },
      });

      const establishment =
        await this.establishmentsRepository.createEstablishment(
          user.id,
          { name: input.establishmentName, type: input.establishmentType },
          tx,
        );

      const adminRole = await tx.role.findUniqueOrThrow({
        where: { name: "Administrateur" },
      });
      await tx.userEstablishment.create({
        data: {
          userId: user.id,
          establishmentId: establishment.id,
          roleId: adminRole.id,
        },
      });

      return { user, establishment };
    });
  }

  createRefreshToken(input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    createdByIp?: string;
  }): Promise<unknown> {
    return this.prisma.refreshToken.create({ data: input });
  }

  findValidRefreshTokenByHash(tokenHash: string) {
    return this.prisma.refreshToken.findFirst({
      where: { tokenHash, revokedAt: null, expiresAt: { gt: new Date() } },
    });
  }

  revokeRefreshToken(id: string, replacedByToken?: string): Promise<unknown> {
    return this.prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date(), replacedByToken },
    });
  }

  createPasswordResetToken(input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<unknown> {
    return this.prisma.passwordResetToken.create({ data: input });
  }

  findValidPasswordResetTokenByHash(tokenHash: string) {
    return this.prisma.passwordResetToken.findFirst({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
    });
  }

  markPasswordResetTokenUsed(id: string): Promise<unknown> {
    return this.prisma.passwordResetToken.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  createEmailVerificationToken(input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<unknown> {
    return this.prisma.emailVerificationToken.create({ data: input });
  }

  findValidEmailVerificationTokenByHash(tokenHash: string) {
    return this.prisma.emailVerificationToken.findFirst({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
    });
  }

  markEmailVerificationTokenUsed(id: string): Promise<unknown> {
    return this.prisma.emailVerificationToken.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  // Membres actifs de l'établissement dont le rôle porte `permission` — sert
  // à peupler la liste des approbateurs possibles (PIN masqué) et à
  // vérifier un PIN soumis. Un Super Administrateur a implicitement toutes
  // les permissions (voir UsersRepository.toAuthenticatedUser) et le
  // propriétaire de l'établissement peut n'avoir aucune ligne
  // UserEstablishment (créateur, jamais explicitement "membre") : les deux
  // sont donc ajoutés séparément plutôt que déduits de la requête principale.
  async findMembersWithPermission(establishmentId: string, permission: string) {
    const [establishment, memberships] = await Promise.all([
      this.prisma.establishment.findUnique({
        where: { id: establishmentId },
        select: { ownerId: true },
      }),
      this.prisma.userEstablishment.findMany({
        where: {
          establishmentId,
          isActive: true,
          user: { pinCodeHash: { not: null }, deletedAt: null, isActive: true },
          OR: [
            {
              role: {
                permissions: { some: { permission: { key: permission } } },
              },
            },
            { user: { isSuperAdmin: true } },
          ],
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              pinCodeHash: true,
            },
          },
        },
      }),
    ]);

    const seen = new Set(memberships.map((m) => m.user.id));
    if (establishment && !seen.has(establishment.ownerId)) {
      const owner = await this.prisma.user.findFirst({
        where: {
          id: establishment.ownerId,
          pinCodeHash: { not: null },
          deletedAt: null,
          isActive: true,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          pinCodeHash: true,
        },
      });
      if (owner) {
        memberships.push({ user: owner } as (typeof memberships)[number]);
      }
    }

    return memberships;
  }
}
