import type { InventorySessionStatus } from "../enums.js";

export interface InventoryItem {
  id: string;
  inventorySessionId: string;
  productId: string;
  theoreticalQuantity: string;
  realQuantity: string;
  difference: string;
  notes: string | null;
  product?: { id: string; name: string; baseUnit?: { symbol: string } };
}

export interface InventorySession {
  id: string;
  establishmentId: string;
  employeeId: string;
  status: InventorySessionStatus;
  notes: string | null;
  startedAt: string;
  completedAt: string | null;
  items: InventoryItem[];
}
