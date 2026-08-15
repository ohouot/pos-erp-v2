import type { PurchaseStatus } from "../enums.js";
import type { Unit } from "./unit.js";

export interface PurchaseItem {
  id: string;
  purchaseId: string;
  productId: string;
  unitId: string;
  quantity: string;
  purchasePrice: string;
  suggestedSalePrice: string | null;
  product?: { id: string; name: string };
  unit?: Unit;
}

export interface Purchase {
  id: string;
  establishmentId: string;
  supplierId: string;
  employeeId: string;
  invoiceNumber: string | null;
  purchaseDate: string;
  observation: string | null;
  totalAmount: string;
  status: PurchaseStatus;
  createdAt: string;
  updatedAt: string;
  supplier?: { id: string; name: string };
  items: PurchaseItem[];
}
