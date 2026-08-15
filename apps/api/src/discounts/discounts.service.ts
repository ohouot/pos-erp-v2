import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DiscountsRepository } from "./discounts.repository.js";
import type { CreateDiscountDto } from "./dto/create-discount.dto.js";
import type { UpdateDiscountDto } from "./dto/update-discount.dto.js";

function assertPercentageCap(type: string, value: number): void {
  if (type === "PERCENTAGE" && value > 100) {
    throw new BadRequestException("Un pourcentage ne peut pas dépasser 100");
  }
}

@Injectable()
export class DiscountsService {
  constructor(private readonly discountsRepository: DiscountsRepository) {}

  list(establishmentId: string, activeOnly?: boolean) {
    return activeOnly
      ? this.discountsRepository.findActiveForEstablishment(establishmentId)
      : this.discountsRepository.findAllForEstablishment(establishmentId);
  }

  create(establishmentId: string, input: CreateDiscountDto) {
    assertPercentageCap(input.type, input.value);
    return this.discountsRepository.create(establishmentId, {
      ...input,
      startDate: input.startDate ? new Date(input.startDate) : undefined,
      endDate: input.endDate ? new Date(input.endDate) : undefined,
    });
  }

  private async findOrThrow(establishmentId: string, id: string) {
    const discount = await this.discountsRepository.findById(
      establishmentId,
      id,
    );
    if (!discount) throw new NotFoundException("Remise introuvable");
    return discount;
  }

  get(establishmentId: string, id: string) {
    return this.findOrThrow(establishmentId, id);
  }

  // Contrairement au projet de référence (qui ne revérifie pas le plafond
  // de 100% sur une mise à jour partielle, faute de recharger l'état
  // existant), on fusionne ici avec l'enregistrement courant avant de
  // revalider — corrige une vraie lacune de cohérence des données plutôt
  // que de la reproduire.
  async update(establishmentId: string, id: string, input: UpdateDiscountDto) {
    const existing = await this.findOrThrow(establishmentId, id);
    const effectiveType = input.type ?? existing.type;
    const effectiveValue = input.value ?? Number(existing.value);
    assertPercentageCap(effectiveType, effectiveValue);
    return this.discountsRepository.update(id, {
      ...input,
      startDate: input.startDate ? new Date(input.startDate) : undefined,
      endDate: input.endDate ? new Date(input.endDate) : undefined,
    });
  }

  async remove(establishmentId: string, id: string) {
    await this.findOrThrow(establishmentId, id);
    await this.discountsRepository.remove(id);
  }
}
