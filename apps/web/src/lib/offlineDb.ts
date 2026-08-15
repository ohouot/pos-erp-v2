import Dexie, { type EntityTable } from "dexie";

// IndexedDB n'existe que côté navigateur — ce module ne doit jamais être
// importé depuis un Server Component ni évalué pendant le build (voir
// OfflineProvider.tsx, seul point d'entrée client autorisé).

export interface OfflineOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
}

export type OfflineOrderStatus = "pending" | "syncing" | "failed" | "synced";

export interface OfflineOrder {
  localId: string; // crypto.randomUUID() — devient clientTicketId côté serveur
  orderType: "DINE_IN" | "TAKEAWAY" | "DELIVERY";
  tableIds: string[];
  tableNames: string[];
  customerId?: string;
  customerName?: string;
  notes?: string;
  items: OfflineOrderItem[];
  createdAt: number;
  status: OfflineOrderStatus;
  error?: string;
  syncedOrderId?: string;
}

class OfflineDatabase extends Dexie {
  orders!: EntityTable<OfflineOrder, "localId">;

  constructor() {
    super("pos-erp-v2-offline-queue");
    this.version(1).stores({
      orders: "localId, status, createdAt",
    });
  }
}

export const offlineDb = new OfflineDatabase();
