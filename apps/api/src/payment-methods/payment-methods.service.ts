import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PaymentMethodsRepository } from "./payment-methods.repository.js";
import type { CreatePaymentMethodDto } from "./dto/create-payment-method.dto.js";
import type { UpdatePaymentMethodDto } from "./dto/update-payment-method.dto.js";

@Injectable()
export class PaymentMethodsService {
  constructor(
    private readonly paymentMethodsRepository: PaymentMethodsRepository,
  ) {}

  list(establishmentId: string, activeOnly?: boolean) {
    return this.paymentMethodsRepository.findAllForEstablishment(
      establishmentId,
      activeOnly,
    );
  }

  async create(establishmentId: string, input: CreatePaymentMethodDto) {
    try {
      return await this.paymentMethodsRepository.create(establishmentId, input);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        throw new ConflictException("Ce code est déjà utilisé");
      }
      throw err;
    }
  }

  private async findOrThrow(establishmentId: string, id: string) {
    const method = await this.paymentMethodsRepository.findById(
      establishmentId,
      id,
    );
    if (!method) throw new NotFoundException("Moyen de paiement introuvable");
    return method;
  }

  get(establishmentId: string, id: string) {
    return this.findOrThrow(establishmentId, id);
  }

  async update(
    establishmentId: string,
    id: string,
    input: UpdatePaymentMethodDto,
  ) {
    await this.findOrThrow(establishmentId, id);
    return this.paymentMethodsRepository.update(id, input);
  }

  // Historique de trésorerie jamais effacé : un moyen de paiement déjà
  // utilisé ne peut être que désactivé (isActive:false), pas supprimé.
  async remove(establishmentId: string, id: string) {
    await this.findOrThrow(establishmentId, id);
    const count = await this.paymentMethodsRepository.countPayments(id);
    if (count > 0) {
      throw new BadRequestException(
        "Ce moyen de paiement a déjà été utilisé — désactivez-le au lieu de le supprimer",
      );
    }
    await this.paymentMethodsRepository.remove(id);
  }
}
