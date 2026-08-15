import type { CashMovementType, CashSessionStatus } from "../enums.js";

export interface CashMovement {
  id: string;
  cashSessionId: string;
  type: CashMovementType;
  amount: string;
  reason: string | null;
  employeeId: string;
  createdAt: string;
}

// Snapshot figé au moment de la clôture (voir cashier.service.closeSession) —
// jamais recalculé après coup, contrairement aux champs de solde qui
// existaient déjà.
export interface CashSessionSummary {
  // Clé = PaymentMethod.code (plus un enum figé, voir types/paymentMethod.ts).
  totalSalesByMethod: Record<string, string>;
  totalSales: string;
  orderCount: number;
  invoiceNumberRange: { first: string; last: string } | null;
  totalDeposits: string;
  totalWithdrawals: string;
}

export interface CashSession {
  id: string;
  establishmentId: string;
  employeeId: string;
  openingBalance: string;
  closingBalanceExpected: string | null;
  closingBalanceCounted: string | null;
  difference: string | null;
  status: CashSessionStatus;
  notes: string | null;
  openedAt: string;
  closedAt: string | null;
  closureNumber: number | null;
  summary: CashSessionSummary | null;
  movements: CashMovement[];
}
