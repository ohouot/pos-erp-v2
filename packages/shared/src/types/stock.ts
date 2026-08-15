import type { StockMovementType } from "../enums.js";

export interface StockMovement {
  id: string;
  establishmentId: string;
  productId: string;
  type: StockMovementType;
  quantity: string;
  quantityBefore: string;
  quantityAfter: string;
  referenceType: string | null;
  referenceId: string | null;
  // Libellé lisible résolu côté serveur pour la source du mouvement (ex:
  // "Commande FACT-000012", "Achat CIB-2026-0142") — null pour un ajustement
  // manuel (referenceType "MANUAL") ou une référence non résolue.
  referenceLabel: string | null;
  employeeId: string | null;
  reason: string | null;
  createdAt: string;
  product?: { id: string; name: string };
  employee?: { id: string; firstName: string; lastName: string } | null;
}
