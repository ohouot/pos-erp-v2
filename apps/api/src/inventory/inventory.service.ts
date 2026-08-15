import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { InventoryRepository } from "./inventory.repository.js";
import { StockRepository } from "../stock/stock.repository.js";
import type { StartSessionDto } from "./dto/start-session.dto.js";
import type { RecordItemDto } from "./dto/record-item.dto.js";

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryRepository: InventoryRepository,
    private readonly stockRepository: StockRepository,
  ) {}

  startSession(
    establishmentId: string,
    employeeId: string,
    input: StartSessionDto,
  ) {
    return this.inventoryRepository.createSession(
      establishmentId,
      employeeId,
      input.notes,
    );
  }

  list(establishmentId: string, params: { page: number; pageSize: number }) {
    return this.inventoryRepository.findAllPaginated(establishmentId, params);
  }

  private async findOrThrow(establishmentId: string, id: string) {
    const session = await this.inventoryRepository.findById(
      this.prisma,
      establishmentId,
      id,
    );
    if (!session)
      throw new NotFoundException("Session d'inventaire introuvable");
    return session;
  }

  get(establishmentId: string, id: string) {
    return this.findOrThrow(establishmentId, id);
  }

  async recordItem(
    establishmentId: string,
    sessionId: string,
    input: RecordItemDto,
  ) {
    const session = await this.findOrThrow(establishmentId, sessionId);
    if (session.status !== "IN_PROGRESS") {
      throw new BadRequestException(
        "Cette session d'inventaire n'est plus en cours",
      );
    }
    const product = await this.stockRepository.findProductBasic(
      this.prisma,
      establishmentId,
      input.productId,
    );
    if (!product) throw new NotFoundException("Produit introuvable");

    return this.inventoryRepository.upsertItem(this.prisma, {
      inventorySessionId: sessionId,
      productId: input.productId,
      theoreticalQuantity: Number(product.currentStock),
      realQuantity: input.realQuantity,
      notes: input.notes,
    });
  }

  async removeItem(
    establishmentId: string,
    sessionId: string,
    productId: string,
  ) {
    const session = await this.findOrThrow(establishmentId, sessionId);
    if (session.status !== "IN_PROGRESS") {
      throw new BadRequestException(
        "Cette session d'inventaire n'est plus en cours",
      );
    }
    await this.inventoryRepository.removeItem(
      this.prisma,
      sessionId,
      productId,
    );
  }

  // Régularise le stock au moment de la clôture, pas au moment du comptage :
  // entre les deux, d'autres mouvements ont pu survenir (vente, achat...).
  // Le comptage physique fait foi, appliqué à l'état COURANT du produit —
  // pas à l'ancien theoreticalQuantity figé lors de la saisie.
  async completeSession(
    establishmentId: string,
    sessionId: string,
    employeeId: string,
  ) {
    const session = await this.findOrThrow(establishmentId, sessionId);
    if (session.status !== "IN_PROGRESS") {
      throw new BadRequestException(
        "Cette session d'inventaire n'est plus en cours",
      );
    }
    if (session.items.length === 0) {
      throw new BadRequestException("Aucun produit compté dans cet inventaire");
    }

    return this.prisma.$transaction(async (tx) => {
      for (const item of session.items) {
        const product = await this.stockRepository.findProductBasic(
          tx,
          establishmentId,
          item.productId,
        );
        if (!product) continue;

        const quantityBefore = Number(product.currentStock);
        const quantityAfter = Number(item.realQuantity);
        const delta = quantityAfter - quantityBefore;
        if (delta === 0) continue;

        await this.stockRepository.setProductStock(
          tx,
          item.productId,
          quantityAfter,
        );
        await this.stockRepository.createStockMovement(tx, {
          establishmentId,
          productId: item.productId,
          type: "INVENTORY_CORRECTION",
          quantity: Math.abs(delta),
          quantityBefore,
          quantityAfter,
          referenceType: "INVENTORY",
          referenceId: sessionId,
          employeeId,
          reason: item.notes ?? undefined,
        });
      }
      return this.inventoryRepository.updateSessionStatus(
        tx,
        sessionId,
        "COMPLETED",
        new Date(),
      );
    });
  }

  async cancelSession(establishmentId: string, sessionId: string) {
    const session = await this.findOrThrow(establishmentId, sessionId);
    if (session.status !== "IN_PROGRESS") {
      throw new BadRequestException(
        "Cette session d'inventaire n'est plus en cours",
      );
    }
    return this.inventoryRepository.updateSessionStatus(
      this.prisma,
      sessionId,
      "CANCELLED",
    );
  }
}
