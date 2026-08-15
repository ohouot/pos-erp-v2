import { BadRequestException, Injectable } from "@nestjs/common";
import { StockRepository, type Db } from "./stock.repository.js";
import type { DeductionContext } from "./stock-deduction.service.js";

export interface PurchaseReceiptItem {
  productId: string;
  unitId: string;
  quantity: number;
}

@Injectable()
export class StockIncrementService {
  constructor(private readonly stockRepository: StockRepository) {}

  // Réception d'un achat : convertit la quantité reçue (exprimée dans
  // l'unité d'achat, ex: "Casier") vers l'unité de base du stock via
  // ProductUnit.conversionToBase si l'unité d'achat diffère de l'unité de
  // base — rejette si aucune conversion n'est configurée pour ce couple.
  async incrementStockForPurchase(
    db: Db,
    establishmentId: string,
    items: PurchaseReceiptItem[],
    context: DeductionContext,
  ): Promise<void> {
    for (const item of items) {
      const product = await db.product.findFirst({
        where: { id: item.productId, establishmentId, deletedAt: null },
        include: { packagingUnits: true },
      });
      if (!product) {
        throw new BadRequestException(
          "Produit introuvable pour la réception d'achat",
        );
      }

      let baseQuantity = item.quantity;
      if (item.unitId !== product.baseUnitId) {
        const packagingUnit = product.packagingUnits.find(
          (u) => u.unitId === item.unitId,
        );
        if (!packagingUnit) {
          throw new BadRequestException(
            `Aucune conversion configurée entre l'unité d'achat et l'unité de base pour "${product.name}"`,
          );
        }
        baseQuantity = item.quantity * Number(packagingUnit.conversionToBase);
      }

      const quantityBefore = Number(product.currentStock);
      const quantityAfter = quantityBefore + baseQuantity;

      await this.stockRepository.incrementProductStock(
        db,
        item.productId,
        baseQuantity,
      );
      await this.stockRepository.createStockMovement(db, {
        establishmentId,
        productId: item.productId,
        type: "PURCHASE_IN",
        quantity: baseQuantity,
        quantityBefore,
        quantityAfter,
        referenceType: context.referenceType,
        referenceId: context.referenceId,
        employeeId: context.employeeId,
      });
    }
  }
}
