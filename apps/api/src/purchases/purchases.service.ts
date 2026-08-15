import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { PurchasesRepository } from "./purchases.repository.js";
import { StockIncrementService } from "../stock/stock-increment.service.js";
import type { CreatePurchaseDto } from "./dto/create-purchase.dto.js";
import type { UpdatePurchaseDto } from "./dto/update-purchase.dto.js";
import type { PurchaseStatus } from "@prisma/client";

@Injectable()
export class PurchasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly purchasesRepository: PurchasesRepository,
    private readonly stockIncrementService: StockIncrementService,
  ) {}

  create(
    establishmentId: string,
    employeeId: string,
    input: CreatePurchaseDto,
  ) {
    return this.purchasesRepository.create(establishmentId, employeeId, {
      ...input,
      purchaseDate: input.purchaseDate
        ? new Date(input.purchaseDate)
        : undefined,
    });
  }

  list(
    establishmentId: string,
    params: {
      page: number;
      pageSize: number;
      status?: PurchaseStatus;
      supplierId?: string;
    },
  ) {
    return this.purchasesRepository.findAllPaginated(establishmentId, params);
  }

  private async findOrThrow(establishmentId: string, id: string) {
    const purchase = await this.purchasesRepository.findById(
      establishmentId,
      id,
    );
    if (!purchase) throw new NotFoundException("Bon d'achat introuvable");
    return purchase;
  }

  get(establishmentId: string, id: string) {
    return this.findOrThrow(establishmentId, id);
  }

  async update(establishmentId: string, id: string, input: UpdatePurchaseDto) {
    const purchase = await this.findOrThrow(establishmentId, id);
    if (purchase.status !== "DRAFT") {
      throw new BadRequestException(
        "Seul un bon d'achat en brouillon peut être modifié",
      );
    }
    return this.purchasesRepository.update(id, {
      ...input,
      purchaseDate: input.purchaseDate
        ? new Date(input.purchaseDate)
        : undefined,
    });
  }

  // Réception : incrémente le stock (converti vers l'unité de base si
  // besoin) pour chaque ligne, trace un mouvement PURCHASE_IN par ligne,
  // puis passe le statut à VALIDATED — le tout dans une seule transaction.
  async validate(establishmentId: string, id: string, employeeId: string) {
    const purchase = await this.findOrThrow(establishmentId, id);
    if (purchase.status !== "DRAFT") {
      throw new BadRequestException(
        "Seul un bon d'achat en brouillon peut être validé",
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await this.stockIncrementService.incrementStockForPurchase(
        tx,
        establishmentId,
        purchase.items.map((item) => ({
          productId: item.productId,
          unitId: item.unitId,
          quantity: Number(item.quantity),
        })),
        { referenceType: "PURCHASE", referenceId: purchase.id, employeeId },
      );
      return this.purchasesRepository.updateStatus(tx, id, "VALIDATED");
    });
  }

  // Annulation possible uniquement avant réception (DRAFT) — aucune reprise
  // de stock n'existe une fois VALIDATED, comme dans le projet de référence.
  async cancel(establishmentId: string, id: string) {
    const purchase = await this.findOrThrow(establishmentId, id);
    if (purchase.status !== "DRAFT") {
      throw new BadRequestException(
        "Seul un bon d'achat en brouillon peut être annulé",
      );
    }
    return this.purchasesRepository.updateStatus(this.prisma, id, "CANCELLED");
  }
}
