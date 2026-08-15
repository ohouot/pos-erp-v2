import { Injectable } from "@nestjs/common";
import { StockRepository } from "./stock.repository.js";
import { NotificationsRepository } from "../notifications/notifications.repository.js";
import { NotificationsService } from "../notifications/notifications.service.js";
import type { StockChangeResult } from "./stock-deduction.service.js";

// En dessous de ce nombre de produits sous seuil, pas besoin de suggérer un
// inventaire complet — seules les alertes individuelles suffisent.
const INVENTORY_DUE_THRESHOLD = 3;

@Injectable()
export class StockAlertsService {
  constructor(
    private readonly stockRepository: StockRepository,
    private readonly notificationsRepository: NotificationsRepository,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async maybeNotifyInventoryDue(
    establishmentId: string,
  ): Promise<void> {
    const lowStockProducts =
      await this.stockRepository.findLowStockProducts(establishmentId);
    if (lowStockProducts.length < INVENTORY_DUE_THRESHOLD) return;

    const alreadyNotified = await this.notificationsRepository.hasUnreadOfType(
      establishmentId,
      "INVENTORY_DUE",
    );
    if (alreadyNotified) return;

    await this.notificationsService.notify({
      establishmentId,
      type: "INVENTORY_DUE",
      title: "Inventaire recommandé",
      message: `${lowStockProducts.length} produits sont sous leur seuil minimum. Un inventaire physique est recommandé.`,
    });
  }

  // À appeler uniquement après le commit réussi de la transaction ayant
  // modifié le stock (voir StockChangeResult) — jamais depuis l'intérieur.
  async maybeNotifyLowStock(
    establishmentId: string,
    change: StockChangeResult,
  ): Promise<void> {
    if (change.quantityAfter > change.minStock) return;

    const dataMatch = { productId: change.productId };
    const alreadyNotified = await this.notificationsRepository.hasUnreadOfType(
      establishmentId,
      "LOW_STOCK",
      dataMatch,
    );
    if (alreadyNotified) return;

    await this.notificationsService.notify({
      establishmentId,
      type: "LOW_STOCK",
      title: "Stock faible",
      message: `Le stock de "${change.name}" est descendu à ${change.quantityAfter} (seuil : ${change.minStock}).`,
      data: dataMatch,
    });

    await this.maybeNotifyInventoryDue(establishmentId);
  }
}
