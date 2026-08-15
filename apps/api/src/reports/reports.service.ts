import { Injectable } from "@nestjs/common";
import type {
  DailyReportSummary,
  DashboardSummary,
  EstablishmentSettings,
  FinancialSummary,
} from "@pos-erp-v2/shared";
import { PrismaService } from "../prisma/prisma.service.js";
import { getBusinessDayStart } from "../common/utils/business-day.util.js";
import { ReportsRepository } from "./reports.repository.js";
import type { DailyReportQueryDto } from "./dto/daily-report-query.dto.js";
import type { DashboardQueryDto } from "./dto/dashboard-query.dto.js";
import type { FinancialSummaryQueryDto } from "./dto/financial-summary-query.dto.js";

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

// Journée/semaine "métier" : bascule à businessDayStartHour, pas à minuit
// calendaire — sinon les ventes d'un bar ouvert après minuit se retrouvent
// comptées sur le mauvais jour dans les KPI.
function startOfWeek(date: Date, cutoverHour: number): Date {
  const businessDayStart = getBusinessDayStart(date, cutoverHour);
  const day = businessDayStart.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const weekStart = new Date(businessDayStart);
  weekStart.setDate(weekStart.getDate() - diff);
  return weekStart;
}

function startOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 0, 1);
}

const TOP_LIST_LIMIT = 5;
const TREND_DAYS = 14;

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reportsRepository: ReportsRepository,
  ) {}

  private async getBusinessDayCutoverHour(
    establishmentId: string,
  ): Promise<number> {
    const establishment = await this.prisma.establishment.findUnique({
      where: { id: establishmentId },
      select: { settings: true },
    });
    const settings = establishment?.settings as EstablishmentSettings | null;
    return settings?.businessDayStartHour ?? 0;
  }

  // Le mois calendaire ici (contrairement à getDashboard/getDailyReport, qui
  // utilisent la journée métier) — incohérence assumée du projet de
  // référence entre rapport financier mensuel et tableau de bord quotidien,
  // reproduite telle quelle.
  async getFinancialSummary(
    establishmentId: string,
    query: FinancialSummaryQueryDto,
  ): Promise<FinancialSummary> {
    const now = new Date();
    const from = query.from ? new Date(query.from) : startOfMonth(now);
    const to = query.to ? new Date(query.to) : endOfMonth(now);

    const [revenue, purchaseCost, expenses, expensesByCategory] =
      await Promise.all([
        this.reportsRepository.sumRevenue(establishmentId, from, to),
        this.reportsRepository.sumPurchaseCost(establishmentId, from, to),
        this.reportsRepository.sumExpenses(establishmentId, from, to),
        this.reportsRepository.expensesByCategory(establishmentId, from, to),
      ]);

    const grossMargin = revenue - purchaseCost;
    const grossMarginPercent = revenue > 0 ? (grossMargin / revenue) * 100 : 0;
    const netResult = grossMargin - expenses;

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      revenue: revenue.toFixed(2),
      purchaseCost: purchaseCost.toFixed(2),
      expenses: expenses.toFixed(2),
      grossMargin: grossMargin.toFixed(2),
      grossMarginPercent: grossMarginPercent.toFixed(2),
      netResult: netResult.toFixed(2),
      expensesByCategory: expensesByCategory.map((row) => ({
        categoryId: row.categoryId,
        categoryName: row.categoryName,
        total: row.total.toFixed(2),
      })),
    };
  }

  async getDashboard(
    establishmentId: string,
    query: DashboardQueryDto,
  ): Promise<DashboardSummary> {
    const now = new Date();
    const cutoverHour = await this.getBusinessDayCutoverHour(establishmentId);
    const dayStart = getBusinessDayStart(now, cutoverHour);
    const weekStart = startOfWeek(now, cutoverHour);
    const monthStart = startOfMonth(now);
    const yearStart = startOfYear(now);

    const trendFrom = query.from
      ? new Date(query.from)
      : getBusinessDayStart(
          new Date(now.getTime() - (TREND_DAYS - 1) * 24 * 60 * 60 * 1000),
          cutoverHour,
        );
    const trendTo = query.to ? new Date(query.to) : now;

    const [
      dayRevenue,
      dayOrders,
      weekRevenue,
      weekOrders,
      monthRevenue,
      monthOrders,
      yearRevenue,
      yearOrders,
      customersServedMonth,
      unsettledSales,
      revenueTrend,
      topProducts,
      topEmployees,
    ] = await Promise.all([
      this.reportsRepository.sumRevenue(establishmentId, dayStart, now),
      this.reportsRepository.countOrders(establishmentId, dayStart, now),
      this.reportsRepository.sumRevenue(establishmentId, weekStart, now),
      this.reportsRepository.countOrders(establishmentId, weekStart, now),
      this.reportsRepository.sumRevenue(establishmentId, monthStart, now),
      this.reportsRepository.countOrders(establishmentId, monthStart, now),
      this.reportsRepository.sumRevenue(establishmentId, yearStart, now),
      this.reportsRepository.countOrders(establishmentId, yearStart, now),
      this.reportsRepository.countDistinctCustomers(
        establishmentId,
        monthStart,
        now,
      ),
      this.reportsRepository.sumUnsettled(establishmentId),
      this.reportsRepository.dailyRevenue(establishmentId, trendFrom, trendTo),
      this.reportsRepository.topProducts(
        establishmentId,
        trendFrom,
        trendTo,
        TOP_LIST_LIMIT,
      ),
      this.reportsRepository.topEmployees(
        establishmentId,
        trendFrom,
        trendTo,
        TOP_LIST_LIMIT,
      ),
    ]);

    return {
      day: { revenue: dayRevenue.toFixed(2), orders: dayOrders },
      week: { revenue: weekRevenue.toFixed(2), orders: weekOrders },
      month: { revenue: monthRevenue.toFixed(2), orders: monthOrders },
      year: { revenue: yearRevenue.toFixed(2), orders: yearOrders },
      customersServedMonth,
      unsettledSales: {
        amount: unsettledSales.amount.toFixed(2),
        count: unsettledSales.count,
      },
      revenueTrend: revenueTrend.map((point) => ({
        date: point.date,
        revenue: point.revenue.toFixed(2),
      })),
      topProducts: topProducts.map((product) => ({
        productId: product.productId,
        name: product.name,
        quantity: product.quantity.toFixed(3),
        revenue: product.revenue.toFixed(2),
      })),
      topEmployees: topEmployees.map((employee) => ({
        employeeId: employee.employeeId,
        name: employee.name,
        revenue: employee.revenue.toFixed(2),
        orderCount: employee.orderCount,
      })),
    };
  }

  // Rapport de clôture sur une journée métier — équivalent en lecture seule,
  // calculé à la demande, de ce qu'une session de caisse fige à sa fermeture :
  // ne dépend pas d'avoir ouvert/fermé une session pour être consulté.
  async getDailyReport(
    establishmentId: string,
    query: DailyReportQueryDto,
  ): Promise<DailyReportSummary> {
    const cutoverHour = await this.getBusinessDayCutoverHour(establishmentId);
    const periodStart = getBusinessDayStart(
      query.date ? new Date(query.date) : new Date(),
      cutoverHour,
    );
    const periodEnd = new Date(periodStart);
    periodEnd.setDate(periodEnd.getDate() + 1);
    periodEnd.setMilliseconds(periodEnd.getMilliseconds() - 1);

    const [
      sales,
      totalPayments,
      profit,
      cashMovements,
      unsettled,
      cancelledOrders,
      wasteMovements,
      restocking,
      advancePayments,
      paymentsByMethod,
    ] = await Promise.all([
      this.reportsRepository.salesForPeriod(
        establishmentId,
        periodStart,
        periodEnd,
      ),
      this.reportsRepository.sumRevenue(
        establishmentId,
        periodStart,
        periodEnd,
      ),
      this.reportsRepository.sumProfit(establishmentId, periodStart, periodEnd),
      this.reportsRepository.sumCashMovements(
        establishmentId,
        periodStart,
        periodEnd,
      ),
      this.reportsRepository.sumUnsettled(establishmentId),
      this.reportsRepository.cancelledOrdersForPeriod(
        establishmentId,
        periodStart,
        periodEnd,
      ),
      this.reportsRepository.wasteMovementsForPeriod(
        establishmentId,
        periodStart,
        periodEnd,
      ),
      this.reportsRepository.restockingForPeriod(
        establishmentId,
        periodStart,
        periodEnd,
      ),
      this.reportsRepository.advancePaymentsForPeriod(
        establishmentId,
        periodStart,
        periodEnd,
        periodStart,
      ),
      this.reportsRepository.paymentsByMethodForPeriod(
        establishmentId,
        periodStart,
        periodEnd,
      ),
    ]);

    // Reconstruit le brut et la remise (lignes + remise globale) à partir des
    // montants déjà stockés par commande — la remise globale n'est pas
    // stockée telle quelle, seulement déductible de subtotal+taxAmount vs
    // totalAmount.
    let totalToPay = 0;
    let totalDiscount = 0;
    for (const order of sales) {
      const subtotal = Number(order.subtotal);
      const taxAmount = Number(order.taxAmount);
      const totalAmount = Number(order.totalAmount);
      const lineDiscount = Number(order.discountAmount);
      const preGlobalTotal = subtotal + taxAmount;
      const globalDiscount = order.globalDiscountType
        ? Math.max(preGlobalTotal - totalAmount, 0)
        : 0;
      totalToPay += totalAmount;
      totalDiscount += lineDiscount + globalDiscount;
    }
    const totalSales = totalToPay + totalDiscount;

    const cancellationsAmount = cancelledOrders.reduce(
      (s, o) => s + o.amount,
      0,
    );
    const wasteAmount = wasteMovements.reduce((s, w) => s + w.amount, 0);
    const restockingAmount = restocking.reduce((s, r) => s + r.amount, 0);
    const advanceAmount = advancePayments.reduce((s, a) => s + a.amount, 0);

    return {
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      saleCount: sales.length,
      totalSales: totalSales.toFixed(2),
      totalDiscount: totalDiscount.toFixed(2),
      totalToPay: totalToPay.toFixed(2),
      totalPayments: totalPayments.toFixed(2),
      totalRemaining: unsettled.amount.toFixed(2),
      totalProfit: profit.toFixed(2),
      cashDeposits: cashMovements.deposits.toFixed(2),
      cashWithdrawals: cashMovements.withdrawals.toFixed(2),
      totalProfitMinusCharges: (profit - cashMovements.withdrawals).toFixed(2),
      advancePayments: {
        count: advancePayments.length,
        amount: advanceAmount.toFixed(2),
        rows: advancePayments.map((payment) => ({
          id: payment.id,
          amount: payment.amount.toFixed(2),
          createdAt: payment.createdAt.toISOString(),
          orderNumber: payment.orderNumber,
          methodLabel: payment.methodLabel,
        })),
      },
      cancellations: {
        count: cancelledOrders.length,
        amount: cancellationsAmount.toFixed(2),
        rows: cancelledOrders.map((order) => ({
          id: order.id,
          orderNumber: order.orderNumber,
          amount: order.amount.toFixed(2),
          employeeName: order.employeeName,
          createdAt: order.createdAt.toISOString(),
        })),
      },
      waste: {
        count: wasteMovements.length,
        amount: wasteAmount.toFixed(2),
        rows: wasteMovements.map((movement) => ({
          id: movement.id,
          productName: movement.productName,
          quantity: movement.quantity.toFixed(3),
          amount: movement.amount.toFixed(2),
          employeeName: movement.employeeName,
          createdAt: movement.createdAt.toISOString(),
        })),
      },
      restocking: {
        count: restocking.length,
        amount: restockingAmount.toFixed(2),
        rows: restocking.map((purchase) => ({
          id: purchase.id,
          supplierName: purchase.supplierName,
          amount: purchase.amount.toFixed(2),
          createdAt: purchase.createdAt.toISOString(),
        })),
      },
      paymentsByMethod: paymentsByMethod.map((method) => ({
        code: method.code,
        label: method.label,
        amount: method.amount.toFixed(2),
      })),
      // Champs Decimal Prisma, pas encore convertis en string — comme partout
      // ailleurs dans l'API, la sérialisation JSON à la réponse HTTP fait
      // cette conversion, jamais vérifiée par le compilateur à ce niveau.
      sales: sales as unknown as DailyReportSummary["sales"],
    };
  }
}
