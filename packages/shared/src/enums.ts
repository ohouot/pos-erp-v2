// Miroir des enums Prisma (apps/api/prisma/schema.prisma). Gardés en synchro
// manuellement : c'est la seule source de vérité partagée entre le frontend
// (selects, badges de statut) et le backend (validation Zod des DTO).

export const ESTABLISHMENT_TYPES = [
  "MAQUIS",
  "LOUNGE",
  "BAR",
  "CAVE",
  "RESTAURANT",
  "SNACK",
  "FAST_FOOD",
  "GLACIER",
  "CAFE",
  "HOTEL",
] as const;
export type EstablishmentType = (typeof ESTABLISHMENT_TYPES)[number];

export const ORDER_STATUSES = [
  "OPEN",
  "SENT_TO_KITCHEN",
  "SERVED",
  "PAID",
  "CANCELLED",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

// Vue simplifiée en 3 niveaux pour l'affichage (filtres, badges, rapports) —
// demande explicite : "Encaissée / Annulée / Pas soldée" partout dans
// l'app, sans toucher au cycle de vie réel de la commande (OPEN →
// SENT_TO_KITCHEN → SERVED → PAID, ou CANCELLED) qui reste nécessaire pour
// l'écran cuisine et le décompte de stock (voir orders.service.sendToKitchen).
// OPEN/SENT_TO_KITCHEN/SERVED sont tous regroupés sous "UNPAID" : aucun des
// trois n'est encore soldé, peu importe l'avancement en cuisine.
export const ORDER_PAID_STATUS_GROUPS = [
  "UNPAID",
  "PAID",
  "CANCELLED",
] as const;
export type OrderPaidStatusGroup = (typeof ORDER_PAID_STATUS_GROUPS)[number];

export const ORDER_STATUS_TO_PAID_GROUP: Record<
  OrderStatus,
  OrderPaidStatusGroup
> = {
  OPEN: "UNPAID",
  SENT_TO_KITCHEN: "UNPAID",
  SERVED: "UNPAID",
  PAID: "PAID",
  CANCELLED: "CANCELLED",
};

export const ORDER_PAID_STATUS_GROUP_LABELS: Record<
  OrderPaidStatusGroup,
  string
> = {
  UNPAID: "Pas soldée",
  PAID: "Encaissée",
  CANCELLED: "Annulée",
};

export const ORDER_TYPES = ["DINE_IN", "TAKEAWAY", "DELIVERY"] as const;
export type OrderType = (typeof ORDER_TYPES)[number];

export const ORDER_ITEM_STATUSES = [
  "PENDING",
  "PREPARING",
  "READY",
  "SERVED",
  "CANCELLED",
] as const;
export type OrderItemStatus = (typeof ORDER_ITEM_STATUSES)[number];

// Les moyens de paiement ne sont plus un enum figé : liste configurable par
// établissement, voir types/paymentMethod.ts et le module paymentMethods.
// "CASH" reste un `code` conventionnel (jamais modifiable après création,
// voir schemas/paymentMethod.ts) pour continuer à détecter le paiement en
// espèces (calcul de la monnaie) sans dépendre du libellé affiché.

export const CASH_SESSION_STATUSES = ["OPEN", "CLOSED"] as const;
export type CashSessionStatus = (typeof CASH_SESSION_STATUSES)[number];

export const CASH_MOVEMENT_TYPES = ["DEPOSIT", "WITHDRAWAL"] as const;
export type CashMovementType = (typeof CASH_MOVEMENT_TYPES)[number];

export const BANK_MOVEMENT_TYPES = ["DEPOSIT", "WITHDRAWAL"] as const;
export type BankMovementType = (typeof BANK_MOVEMENT_TYPES)[number];

export const STOCK_MOVEMENT_TYPES = [
  "PURCHASE_IN",
  "SALE_OUT",
  "RECIPE_CONSUMPTION",
  "ADJUSTMENT_IN",
  "ADJUSTMENT_OUT",
  "INVENTORY_CORRECTION",
  "TRANSFER_IN",
  "TRANSFER_OUT",
] as const;
export type StockMovementType = (typeof STOCK_MOVEMENT_TYPES)[number];

export const PURCHASE_STATUSES = ["DRAFT", "VALIDATED", "CANCELLED"] as const;
export type PurchaseStatus = (typeof PURCHASE_STATUSES)[number];

export const TABLE_STATUSES = [
  "FREE",
  "OCCUPIED",
  "RESERVED",
  "CLEANING",
] as const;
export type TableStatus = (typeof TABLE_STATUSES)[number];

export const RESERVATION_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "CANCELLED",
  "COMPLETED",
  "NO_SHOW",
] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export const DISCOUNT_TYPES = ["PERCENTAGE", "FIXED"] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];

export const INVENTORY_SESSION_STATUSES = [
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;
export type InventorySessionStatus =
  (typeof INVENTORY_SESSION_STATUSES)[number];

// Utilisé uniquement pour choisir un avatar par défaut (silhouette) tant
// qu'aucune photo n'est téléversée — jamais requis, jamais exploité ailleurs.
export const GENDERS = ["MALE", "FEMALE"] as const;
export type Gender = (typeof GENDERS)[number];

export const SYSTEM_ROLES = [
  "Super Administrateur",
  "Administrateur",
  "Gérant",
  "Caissier",
  "Serveur",
  "Responsable Stock",
  "Comptable",
] as const;
export type SystemRole = (typeof SYSTEM_ROLES)[number];
