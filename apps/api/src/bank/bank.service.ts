import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { BankRepository } from "./bank.repository.js";
import type { CreateBankAccountDto } from "./dto/create-bank-account.dto.js";
import type { UpdateBankAccountDto } from "./dto/update-bank-account.dto.js";
import type { BankMovementDto } from "./dto/bank-movement.dto.js";

@Injectable()
export class BankService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bankRepository: BankRepository,
  ) {}

  list(establishmentId: string) {
    return this.bankRepository.findAllForEstablishment(establishmentId);
  }

  create(establishmentId: string, input: CreateBankAccountDto) {
    return this.bankRepository.create(establishmentId, input);
  }

  private async findOrThrow(establishmentId: string, id: string) {
    const account = await this.bankRepository.findById(establishmentId, id);
    if (!account) throw new NotFoundException("Compte bancaire introuvable");
    return account;
  }

  get(establishmentId: string, id: string) {
    return this.findOrThrow(establishmentId, id);
  }

  async update(
    establishmentId: string,
    id: string,
    input: UpdateBankAccountDto,
  ) {
    await this.findOrThrow(establishmentId, id);
    return this.bankRepository.update(id, input);
  }

  // Historique de trésorerie jamais effacé : un compte avec des mouvements
  // ne peut être que désactivé, pas supprimé.
  async remove(establishmentId: string, id: string) {
    await this.findOrThrow(establishmentId, id);
    const count = await this.bankRepository.countMovements(id);
    if (count > 0) {
      throw new BadRequestException(
        "Ce compte a des mouvements enregistrés — désactivez-le au lieu de le supprimer",
      );
    }
    await this.bankRepository.remove(id);
  }

  private async assertActive(establishmentId: string, id: string) {
    const account = await this.findOrThrow(establishmentId, id);
    if (!account.isActive) {
      throw new BadRequestException("Ce compte est désactivé");
    }
    return account;
  }

  async deposit(
    establishmentId: string,
    id: string,
    employeeId: string,
    input: BankMovementDto,
  ) {
    await this.assertActive(establishmentId, id);
    return this.prisma.$transaction(async (tx) => {
      const movement = await this.bankRepository.createMovement(
        tx,
        id,
        employeeId,
        "DEPOSIT",
        input,
      );
      await this.bankRepository.incrementBalance(tx, id, input.amount);
      return movement;
    });
  }

  async withdraw(
    establishmentId: string,
    id: string,
    employeeId: string,
    input: BankMovementDto,
  ) {
    const account = await this.assertActive(establishmentId, id);
    if (input.amount > Number(account.currentBalance)) {
      throw new BadRequestException("Le retrait dépasse le solde du compte");
    }
    return this.prisma.$transaction(async (tx) => {
      const movement = await this.bankRepository.createMovement(
        tx,
        id,
        employeeId,
        "WITHDRAWAL",
        input,
      );
      await this.bankRepository.decrementBalance(tx, id, input.amount);
      return movement;
    });
  }
}
