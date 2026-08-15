export interface ExpenseCategoryBreakdown {
  categoryId: string;
  categoryName: string;
  total: string;
}

export interface FinancialSummary {
  from: string;
  to: string;
  revenue: string;
  purchaseCost: string;
  expenses: string;
  grossMargin: string;
  grossMarginPercent: string;
  netResult: string;
  expensesByCategory: ExpenseCategoryBreakdown[];
}

export interface PeriodKpi {
  revenue: string;
  orders: number;
}

export interface TopProduct {
  productId: string;
  name: string;
  quantity: string;
  revenue: string;
}

export interface TopEmployee {
  employeeId: string;
  name: string;
  revenue: string;
  orderCount: number;
}

export interface RevenuePoint {
  date: string;
  revenue: string;
}

// Commandes servies mais pas encore intégralement payées ("l'ardoise") —
// voir reports.repository.sumUnsettled côté API.
export interface UnsettledSalesSummary {
  amount: string;
  count: number;
}

export interface DashboardSummary {
  day: PeriodKpi;
  week: PeriodKpi;
  month: PeriodKpi;
  year: PeriodKpi;
  customersServedMonth: number;
  unsettledSales: UnsettledSalesSummary;
  revenueTrend: RevenuePoint[];
  topProducts: TopProduct[];
  topEmployees: TopEmployee[];
}

export interface PaymentMethodBreakdown {
  code: string;
  label: string;
  amount: string;
}

export interface AdvancePaymentRow {
  id: string;
  amount: string;
  createdAt: string;
  orderNumber: string;
  methodLabel: string;
}

export interface CancelledOrderRow {
  id: string;
  orderNumber: string;
  amount: string;
  employeeName: string;
  createdAt: string;
}

export interface WasteMovementRow {
  id: string;
  productName: string;
  quantity: string;
  amount: string;
  employeeName: string;
  createdAt: string;
}

export interface RestockMovementRow {
  id: string;
  supplierName: string;
  amount: string;
  createdAt: string;
}

export interface CountAmount {
  count: number;
  amount: string;
}

// Rapport de clôture sur une journée métier (voir getBusinessDayStart) —
// équivalent du "clôturer et envoyer" d'une caisse concurrente, mais lu à la
// demande plutôt que figé à la fermeture d'une session (voir CashSession.
// summary pour l'équivalent figé côté session de caisse).
export interface DailyReportSummary {
  periodStart: string;
  periodEnd: string;
  saleCount: number;
  totalSales: string;
  totalDiscount: string;
  totalToPay: string;
  totalPayments: string;
  totalRemaining: string;
  totalProfit: string;
  cashDeposits: string;
  cashWithdrawals: string;
  totalProfitMinusCharges: string;
  advancePayments: CountAmount & { rows: AdvancePaymentRow[] };
  cancellations: CountAmount & { rows: CancelledOrderRow[] };
  waste: CountAmount & { rows: WasteMovementRow[] };
  restocking: CountAmount & { rows: RestockMovementRow[] };
  paymentsByMethod: PaymentMethodBreakdown[];
  sales: import("./order.js").Order[];
}
