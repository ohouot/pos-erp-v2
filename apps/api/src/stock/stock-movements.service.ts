import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { StockMovementType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service.js";
import { StockRepository } from "./stock.repository.js";
import { StockAlertsService } from "./stock-alerts.service.js";
import type { AdjustStockDto } from "./dto/adjust-stock.dto.js";

interface MovementFilters {
  productId?: string;
  type?: StockMovementType;
  from?: Date;
  to?: Date;
}

interface MovementForExport {
  createdAt: Date;
  product: { name: string };
  type: string;
  quantity: unknown;
  quantityBefore: unknown;
  quantityAfter: unknown;
  reason: string | null;
  employee: { firstName: string; lastName: string } | null;
  referenceType: string | null;
  referenceId: string | null;
}

function csvEscape(value: string): string {
  if (/[;,"\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

@Injectable()
export class StockMovementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stockRepository: StockRepository,
    private readonly stockAlertsService: StockAlertsService,
  ) {}

  async listMovements(
    establishmentId: string,
    params: { page: number; pageSize: number } & MovementFilters,
  ) {
    const { items, total } = await this.stockRepository.findAllMovements(
      establishmentId,
      params,
    );
    const referenceLabels = await this.resolveReferenceLabels(items);
    return {
      items: items.map((m) => ({
        ...m,
        referenceLabel:
          referenceLabels.get(`${m.referenceType}:${m.referenceId}`) ?? null,
      })),
      meta: {
        page: params.page,
        pageSize: params.pageSize,
        total,
        totalPages: Math.ceil(total / params.pageSize),
      },
    };
  }

  async listLowStock(establishmentId: string) {
    return this.stockRepository.findLowStockProducts(establishmentId);
  }

  // Résout un libellé humain pour la référence polymorphe (Order/Purchase/
  // InventorySession) en groupant les lookups par referenceType — évite un
  // aller-retour base par mouvement.
  private async resolveReferenceLabels(
    movements: Array<{
      referenceType: string | null;
      referenceId: string | null;
    }>,
  ): Promise<Map<string, string>> {
    const labels = new Map<string, string>();
    const orderIds = new Set<string>();
    const purchaseIds = new Set<string>();
    const inventoryIds = new Set<string>();

    for (const m of movements) {
      if (!m.referenceType || !m.referenceId) continue;
      if (m.referenceType === "ORDER") orderIds.add(m.referenceId);
      else if (m.referenceType === "PURCHASE") purchaseIds.add(m.referenceId);
      else if (m.referenceType === "INVENTORY") inventoryIds.add(m.referenceId);
    }

    const [orders, purchases, sessions] = await Promise.all([
      orderIds.size ? this.stockRepository.findOrdersByIds([...orderIds]) : [],
      purchaseIds.size
        ? this.stockRepository.findPurchasesByIds([...purchaseIds])
        : [],
      inventoryIds.size
        ? this.stockRepository.findInventorySessionsByIds([...inventoryIds])
        : [],
    ]);

    for (const o of orders)
      labels.set(`ORDER:${o.id}`, `Commande ${o.orderNumber}`);
    for (const p of purchases)
      labels.set(
        `PURCHASE:${p.id}`,
        `Achat ${p.invoiceNumber ?? p.id.slice(-6)}`,
      );
    for (const s of sessions) {
      labels.set(
        `INVENTORY:${s.id}`,
        `Inventaire du ${s.startedAt.toISOString().slice(0, 10)}`,
      );
    }

    return labels;
  }

  async exportMovementsCsv(
    establishmentId: string,
    filters: MovementFilters,
  ): Promise<string> {
    const movements = await this.stockRepository.findAllMovementsForExport(
      establishmentId,
      filters,
    );
    const referenceLabels = await this.resolveReferenceLabels(movements);

    const headers = [
      "Date",
      "Produit",
      "Type",
      "Quantité",
      "Stock avant",
      "Stock après",
      "Motif",
      "Employé",
      "Référence",
    ];
    const lines = [headers.join(";")];
    for (const m of movements as MovementForExport[]) {
      const row = [
        m.createdAt.toISOString(),
        m.product.name,
        m.type,
        String(m.quantity),
        String(m.quantityBefore),
        String(m.quantityAfter),
        m.reason ?? "",
        m.employee ? `${m.employee.firstName} ${m.employee.lastName}` : "",
        referenceLabels.get(`${m.referenceType}:${m.referenceId}`) ?? "",
      ];
      lines.push(row.map((v) => csvEscape(v)).join(";"));
    }
    return "﻿" + lines.join("\r\n");
  }

  // Ajustement manuel : lecture-puis-écriture dans une transaction (pas le
  // chemin de décrément atomique par WHERE des ventes) — un stock-taker
  // ajustant un seul produit n'est pas soumis à la même contention
  // concurrente qu'une vente. Vérification explicite quantityAfter >= 0.
  async createManualAdjustment(
    establishmentId: string,
    employeeId: string | undefined,
    input: AdjustStockDto,
  ) {
    const { movement, product, quantityAfter } = await this.prisma.$transaction(
      async (tx) => {
        const product = await this.stockRepository.findProductBasic(
          tx,
          establishmentId,
          input.productId,
        );
        if (!product) throw new NotFoundException("Produit introuvable");

        const quantityBefore = Number(product.currentStock);
        const delta =
          input.type === "ADJUSTMENT_IN" ? input.quantity : -input.quantity;
        const quantityAfter = quantityBefore + delta;
        if (quantityAfter < 0) {
          throw new BadRequestException(
            "Cet ajustement ferait passer le stock en dessous de 0",
          );
        }

        if (input.type === "ADJUSTMENT_IN") {
          await this.stockRepository.incrementProductStock(
            tx,
            product.id,
            input.quantity,
          );
        } else {
          await this.stockRepository.decrementProductStock(
            tx,
            product.id,
            input.quantity,
          );
        }

        const movement = await this.stockRepository.createStockMovement(tx, {
          establishmentId,
          productId: product.id,
          type: input.type,
          quantity: input.quantity,
          quantityBefore,
          quantityAfter,
          referenceType: "MANUAL",
          employeeId,
          reason: input.reason,
        });

        return { movement, product, quantityAfter };
      },
    );

    if (input.type === "ADJUSTMENT_OUT") {
      await this.stockAlertsService.maybeNotifyLowStock(establishmentId, {
        productId: product.id,
        name: product.name,
        minStock: Number(product.minStock),
        quantityAfter,
      });
    }

    return movement;
  }

  // Utilisé par l'import CSV produits (voir ProductsCsvService) : remplace
  // absolument la quantité (jamais additive), même chemin transactionnel.
  async setAbsoluteQuantity(
    establishmentId: string,
    productId: string,
    targetQuantity: number,
    employeeId: string | undefined,
    reason: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUniqueOrThrow({
        where: { id: productId },
        select: { currentStock: true },
      });
      const before = Number(product.currentStock);
      const delta = targetQuantity - before;
      if (delta === 0) return;

      await this.stockRepository.setProductStock(tx, productId, targetQuantity);
      await this.stockRepository.createStockMovement(tx, {
        establishmentId,
        productId,
        type: delta > 0 ? "ADJUSTMENT_IN" : "ADJUSTMENT_OUT",
        quantity: Math.abs(delta),
        quantityBefore: before,
        quantityAfter: targetQuantity,
        referenceType: "MANUAL",
        employeeId,
        reason,
      });
    });
  }
}
