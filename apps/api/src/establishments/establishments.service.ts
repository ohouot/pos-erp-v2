import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { Establishment } from "@prisma/client";
import type { AuthenticatedUser } from "@pos-erp-v2/shared";
import { EstablishmentsRepository } from "./establishments.repository.js";
import type { CreateEstablishmentDto } from "./dto/create-establishment.dto.js";
import type { UpdateEstablishmentDto } from "./dto/update-establishment.dto.js";

@Injectable()
export class EstablishmentsService {
  constructor(
    private readonly establishmentsRepository: EstablishmentsRepository,
    private readonly jwtService: JwtService,
  ) {}

  private hasAccess(
    user: AuthenticatedUser,
    establishment: Establishment,
  ): boolean {
    return (
      user.isSuperAdmin ||
      establishment.ownerId === user.id ||
      user.establishments.some(
        (membership) => membership.establishmentId === establishment.id,
      )
    );
  }

  private async findAccessibleOrThrow(
    user: AuthenticatedUser,
    id: string,
  ): Promise<Establishment> {
    const establishment = await this.establishmentsRepository.findById(id);
    if (!establishment) {
      throw new NotFoundException("Établissement introuvable");
    }
    if (!this.hasAccess(user, establishment)) {
      throw new ForbiddenException("Vous n'avez pas accès à cet établissement");
    }
    return establishment;
  }

  async listAccessibleEstablishments(
    user: AuthenticatedUser,
  ): Promise<Array<Establishment & { myRole: string | null }>> {
    const establishments = user.isSuperAdmin
      ? await this.establishmentsRepository.findAll()
      : await this.establishmentsRepository.findAllAccessibleTo(user.id);
    return establishments.map((establishment) => {
      const membership = user.establishments.find(
        (m) => m.establishmentId === establishment.id,
      );
      return {
        ...establishment,
        myRole:
          membership?.roleName ??
          (establishment.ownerId === user.id
            ? "Propriétaire"
            : user.isSuperAdmin
              ? "Super Administrateur"
              : null),
      };
    });
  }

  createEstablishment(
    user: AuthenticatedUser,
    input: CreateEstablishmentDto,
  ): Promise<Establishment> {
    return this.establishmentsRepository.createEstablishment(user.id, input);
  }

  async getEstablishment(
    user: AuthenticatedUser,
    id: string,
  ): Promise<Establishment> {
    return this.findAccessibleOrThrow(user, id);
  }

  async updateEstablishment(
    user: AuthenticatedUser,
    id: string,
    input: UpdateEstablishmentDto,
  ): Promise<Establishment> {
    await this.findAccessibleOrThrow(user, id);
    return this.establishmentsRepository.updateEstablishment(id, input);
  }

  async selectEstablishment(
    user: AuthenticatedUser,
    id: string,
  ): Promise<{ accessToken: string; establishment: Establishment }> {
    const establishment = await this.findAccessibleOrThrow(user, id);
    if (!establishment.isActive) {
      throw new BadRequestException("Cet établissement est désactivé");
    }
    const accessToken = this.jwtService.sign({
      sub: user.id,
      establishmentId: establishment.id,
    });
    return { accessToken, establishment };
  }
}
