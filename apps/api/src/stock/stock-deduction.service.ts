import {
  ConflictException,
  Injectable,
  BadRequestException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { StockRepository, type Db } from "./stock.repository.js";

export interface DeductionContext {
  referenceType: string;
  referenceId: string;
  employeeId?: string;
}

export interface StockChangeResult {
  productId: string;
  name: string;
  minStock: number;
  quantityAfter: number;
}

@Injectable()
export class StockDeductionService {
  constructor(private readonly stockRepository: StockRepository) {}

  // Décrémente un seul produit de façon atomique, jamais sous 0 — voir
  // StockRepository.decrementProductStock. `manageStock=false` (article de
  // service, ex: "Corkage") ignore entièrement le contrôle/décrément.
  async deductSingleProduct(
    db: Db,
    establishmentId: string,
    productId: string,
    quantity: number,
    type: "SALE_OUT" | "RECIPE_CONSUMPTION",
    context: DeductionContext,
  ): Promise<StockChangeResult | null> {
    const current = await this.stockRepository.findProductBasic(
      db,
      establishmentId,
      productId,
    );
    if (!current) {
      throw new BadRequestException(
        "Produit introuvable pour la déduction de stock",
      );
    }
    if (!current.manageStock) {
      return null;
    }

    const quantityBefore = Number(current.currentStock);
    const quantityAfter = quantityBefore - quantity;

    try {
      await this.stockRepository.decrementProductStock(db, productId, quantity);
    } catch (err) {
      // P2025 = la clause currentStock >= quantity du WHERE n'a matché
      // aucune ligne : une autre vente concurrente a consommé le stock
      // restant entre notre lecture et cet UPDATE. Jamais de stock négatif.
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2025"
      ) {
        throw new ConflictException(
          `Stock insuffisant pour "${current.name}" (une autre vente vient de consommer le stock restant)`,
        );
      }
      throw err;
    }

    await this.stockRepository.createStockMovement(db, {
      establishmentId,
      productId,
      type,
      quantity,
      quantityBefore,
      quantityAfter,
      referenceType: context.referenceType,
      referenceId: context.referenceId,
      employeeId: context.employeeId,
    });

    return {
      productId,
      name: current.name,
      minStock: Number(current.minStock),
      quantityAfter,
    };
  }

  // Produit composé (isComposed) : décrémente chaque ingrédient de la
  // recette (RECIPE_CONSUMPTION), jamais le produit vendu lui-même. Produit
  // simple : décrémente directement (SALE_OUT). Chaque déduction est un
  // UPDATE atomique indépendant ; l'atomicité globale de la vente vient de
  // la transaction Prisma du caller (voir Lot 5, orders.sendToKitchen).
  async deductStockForSale(
    db: Db,
    establishmentId: string,
    items: Array<{ productId: string; quantitySold: number }>,
    context: DeductionContext,
  ): Promise<StockChangeResult[]> {
    const changes: StockChangeResult[] = [];

    for (const item of items) {
      const product = await this.stockRepository.findProductForDeduction(
        db,
        establishmentId,
        item.productId,
      );
      if (!product) {
        throw new BadRequestException(
          "Produit introuvable pour la déduction de stock",
        );
      }

      if (product.isComposed) {
        if (!product.recipe) {
          throw new BadRequestException(
            `"${product.name}" est composé mais n'a pas de recette configurée`,
          );
        }
        for (const ingredient of product.recipe.ingredients) {
          const quantity = Number(ingredient.quantity) * item.quantitySold;
          const change = await this.deductSingleProduct(
            db,
            establishmentId,
            ingredient.ingredientProductId,
            quantity,
            "RECIPE_CONSUMPTION",
            context,
          );
          if (change) changes.push(change);
        }
      } else {
        const change = await this.deductSingleProduct(
          db,
          establishmentId,
          item.productId,
          item.quantitySold,
          "SALE_OUT",
          context,
        );
        if (change) changes.push(change);
      }
    }

    return changes;
  }
}
