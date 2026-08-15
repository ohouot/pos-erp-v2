import { Injectable } from "@nestjs/common";
import type { OrderStatus } from "@prisma/client";
import {
  ORDER_STATUS_TO_PAID_GROUP,
  type OrderPaidStatusGroup,
} from "@pos-erp-v2/shared";
import { PrismaService } from "../prisma/prisma.service.js";

function statusesForPaidGroup(group: OrderPaidStatusGroup): OrderStatus[] {
  return (Object.keys(ORDER_STATUS_TO_PAID_GROUP) as OrderStatus[]).filter(
    (status) => ORDER_STATUS_TO_PAID_GROUP[status] === group,
  );
}

const orderInclude = {
  items: { include: { product: { select: { id: true, name: true } } } },
  orderTables: { include: { table: { select: { id: true, name: true } } } },
  customer: { select: { id: true, firstName: true, lastName: true } },
} as const;

@Injectable()
export class ReportsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private get unpaidStatuses(): OrderStatus[] {
    return statusesForPaidGroup("UNPAID");
  }

  // Chiffre d'affaires = encaissements réels (Payment), pas le total facturé
  // des commandes : c'est la trésorerie effectivement entrée sur la période.
  async sumRevenue(
    establishmentId: string,
    from: Date,
    to: Date,
  ): Promise<number> {
    const result = await this.prisma.payment.aggregate({
      where: { establishmentId, createdAt: { gte: from, lte: to } },
      _sum: { amount: true },
    });
    return Number(result._sum.amount ?? 0);
  }

  // Seuls les achats validés (stock effectivement reçu) comptent comme coût
  // réel — un brouillon n'a impacté ni le stock ni la trésorerie.
  async sumPurchaseCost(
    establishmentId: string,
    from: Date,
    to: Date,
  ): Promise<number> {
    const result = await this.prisma.purchase.aggregate({
      where: {
        establishmentId,
        status: "VALIDATED",
        purchaseDate: { gte: from, lte: to },
      },
      _sum: { totalAmount: true },
    });
    return Number(result._sum.totalAmount ?? 0);
  }

  async sumExpenses(
    establishmentId: string,
    from: Date,
    to: Date,
  ): Promise<number> {
    const result = await this.prisma.expense.aggregate({
      where: { establishmentId, expenseDate: { gte: from, lte: to } },
      _sum: { amount: true },
    });
    return Number(result._sum.amount ?? 0);
  }

  // "Non soldée" = toute commande pas encore payée ni annulée, quel que soit
  // son avancement en cuisine (encore ouverte, envoyée en préparation ou
  // déjà servie) — pas seulement une fois servie.
  async sumUnsettled(
    establishmentId: string,
  ): Promise<{ amount: number; count: number }> {
    const [orderTotals, paymentTotals] = await Promise.all([
      this.prisma.order.aggregate({
        where: { establishmentId, status: { in: this.unpaidStatuses } },
        _sum: { totalAmount: true },
        _count: { _all: true },
      }),
      this.prisma.payment.aggregate({
        where: {
          establishmentId,
          order: { status: { in: this.unpaidStatuses } },
        },
        _sum: { amount: true },
      }),
    ]);
    const totalAmount = Number(orderTotals._sum.totalAmount ?? 0);
    const totalPaid = Number(paymentTotals._sum.amount ?? 0);
    return {
      amount: Math.max(totalAmount - totalPaid, 0),
      count: orderTotals._count._all,
    };
  }

  countOrders(establishmentId: string, from: Date, to: Date): Promise<number> {
    return this.prisma.order.count({
      where: {
        establishmentId,
        status: "PAID",
        closedAt: { gte: from, lte: to },
      },
    });
  }

  // "Clients servis" = clients identifiés (hors passage anonyme) ayant réglé
  // une commande sur la période — un même client revenant plusieurs fois ne
  // compte qu'une fois.
  async countDistinctCustomers(
    establishmentId: string,
    from: Date,
    to: Date,
  ): Promise<number> {
    const rows = await this.prisma.order.findMany({
      where: {
        establishmentId,
        status: "PAID",
        closedAt: { gte: from, lte: to },
        customerId: { not: null },
      },
      select: { customerId: true },
      distinct: ["customerId"],
    });
    return rows.length;
  }

  // Agrégation jour par jour en mémoire plutôt qu'en SQL brut (date_trunc) :
  // évite le SQL spécifique à Postgres pour un volume de paiements qui reste
  // modeste à l'échelle d'un établissement.
  async dailyRevenue(establishmentId: string, from: Date, to: Date) {
    const payments = await this.prisma.payment.findMany({
      where: { establishmentId, createdAt: { gte: from, lte: to } },
      select: { amount: true, createdAt: true },
    });
    const byDay = new Map<string, number>();
    for (const payment of payments) {
      const key = payment.createdAt.toISOString().slice(0, 10);
      byDay.set(key, (byDay.get(key) ?? 0) + Number(payment.amount));
    }
    return [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, revenue]) => ({ date, revenue }));
  }

  async topProducts(
    establishmentId: string,
    from: Date,
    to: Date,
    limit: number,
  ) {
    const rows = await this.prisma.orderItem.groupBy({
      by: ["productId"],
      where: {
        status: { not: "CANCELLED" },
        order: {
          establishmentId,
          status: "PAID",
          closedAt: { gte: from, lte: to },
        },
      },
      _sum: { quantity: true, totalPrice: true },
      orderBy: { _sum: { totalPrice: "desc" } },
      take: limit,
    });
    if (rows.length === 0) return [];
    const products = await this.prisma.product.findMany({
      where: { id: { in: rows.map((row) => row.productId) } },
      select: { id: true, name: true },
    });
    const nameById = new Map(
      products.map((product) => [product.id, product.name]),
    );
    return rows.map((row) => ({
      productId: row.productId,
      name: nameById.get(row.productId) ?? "—",
      quantity: Number(row._sum.quantity ?? 0),
      revenue: Number(row._sum.totalPrice ?? 0),
    }));
  }

  async topEmployees(
    establishmentId: string,
    from: Date,
    to: Date,
    limit: number,
  ) {
    const rows = await this.prisma.order.groupBy({
      by: ["employeeId"],
      where: {
        establishmentId,
        status: "PAID",
        closedAt: { gte: from, lte: to },
      },
      _sum: { totalAmount: true },
      _count: { _all: true },
      orderBy: { _sum: { totalAmount: "desc" } },
      take: limit,
    });
    if (rows.length === 0) return [];
    const users = await this.prisma.user.findMany({
      where: { id: { in: rows.map((row) => row.employeeId) } },
      select: { id: true, firstName: true, lastName: true },
    });
    const byId = new Map(users.map((user) => [user.id, user]));
    return rows.map((row) => {
      const user = byId.get(row.employeeId);
      return {
        employeeId: row.employeeId,
        name: user ? `${user.firstName} ${user.lastName}` : "—",
        revenue: Number(row._sum.totalAmount ?? 0),
        orderCount: row._count._all,
      };
    });
  }

  async expensesByCategory(establishmentId: string, from: Date, to: Date) {
    const rows = await this.prisma.expense.groupBy({
      by: ["categoryId"],
      where: { establishmentId, expenseDate: { gte: from, lte: to } },
      _sum: { amount: true },
    });
    if (rows.length === 0) return [];
    const categories = await this.prisma.expenseCategory.findMany({
      where: { id: { in: rows.map((row) => row.categoryId) } },
      select: { id: true, name: true },
    });
    const nameById = new Map(
      categories.map((category) => [category.id, category.name]),
    );
    return rows.map((row) => ({
      categoryId: row.categoryId,
      categoryName: nameById.get(row.categoryId) ?? "—",
      total: Number(row._sum.amount ?? 0),
    }));
  }

  // Ventes soldées de la période, réutilisées à la fois pour le total
  // brut/remise/à payer (calculé en mémoire ligne par ligne juste après) et
  // pour l'affichage ticket par ticket du rapport de clôture.
  salesForPeriod(establishmentId: string, from: Date, to: Date) {
    return this.prisma.order.findMany({
      where: {
        establishmentId,
        status: "PAID",
        closedAt: { gte: from, lte: to },
      },
      include: orderInclude,
      orderBy: { closedAt: "desc" },
    });
  }

  // Bénéfice = (prix de vente - coût d'achat figé à la vente) par ligne — voir
  // OrderItem.unitCost. Les lignes annulées et les anciennes lignes sans coût
  // figé (unitCost null) ne faussent le calcul que dans un sens prudent
  // (coût traité comme 0, jamais négatif).
  async sumProfit(
    establishmentId: string,
    from: Date,
    to: Date,
  ): Promise<number> {
    const items = await this.prisma.orderItem.findMany({
      where: {
        status: { not: "CANCELLED" },
        order: {
          establishmentId,
          status: "PAID",
          closedAt: { gte: from, lte: to },
        },
      },
      select: {
        quantity: true,
        unitPrice: true,
        unitCost: true,
        discountAmount: true,
      },
    });
    return items.reduce((sum, item) => {
      const revenue =
        Number(item.quantity) * Number(item.unitPrice) -
        Number(item.discountAmount);
      const cost = Number(item.quantity) * Number(item.unitCost ?? 0);
      return sum + (revenue - cost);
    }, 0);
  }

  async sumCashMovements(
    establishmentId: string,
    from: Date,
    to: Date,
  ): Promise<{ deposits: number; withdrawals: number }> {
    const movements = await this.prisma.cashMovement.findMany({
      where: {
        cashSession: { establishmentId },
        createdAt: { gte: from, lte: to },
      },
      select: { type: true, amount: true },
    });
    let deposits = 0;
    let withdrawals = 0;
    for (const movement of movements) {
      if (movement.type === "DEPOSIT") deposits += Number(movement.amount);
      else withdrawals += Number(movement.amount);
    }
    return { deposits, withdrawals };
  }

  // Commandes annulées de la période — approximées par `updatedAt` (aucune
  // date d'annulation dédiée en base), fiable tant que rien d'autre ne
  // modifie une commande après son passage à CANCELLED (terminal).
  async cancelledOrdersForPeriod(
    establishmentId: string,
    from: Date,
    to: Date,
  ) {
    const orders = await this.prisma.order.findMany({
      where: {
        establishmentId,
        status: "CANCELLED",
        updatedAt: { gte: from, lte: to },
      },
      select: {
        id: true,
        orderNumber: true,
        totalAmount: true,
        updatedAt: true,
        employeeId: true,
      },
      orderBy: { updatedAt: "desc" },
    });
    if (orders.length === 0) return [];
    const employees = await this.prisma.user.findMany({
      where: { id: { in: orders.map((order) => order.employeeId) } },
      select: { id: true, firstName: true, lastName: true },
    });
    const employeeById = new Map(
      employees.map((employee) => [employee.id, employee]),
    );
    return orders.map((order) => {
      const employee = employeeById.get(order.employeeId);
      return {
        id: order.id,
        orderNumber: order.orderNumber,
        amount: Number(order.totalAmount),
        employeeName: employee
          ? `${employee.firstName} ${employee.lastName}`
          : "—",
        createdAt: order.updatedAt,
      };
    });
  }

  // Casse/déchet = ajustement manuel de stock avec le motif pré-rempli
  // "Casse" — aucune valeur d'enum dédiée, juste ce texte, donc un filtrage
  // insensible à la casse plutôt qu'un StockMovementType distinct. Valorisé
  // au prix d'achat courant du produit (pas de coût historique figé).
  async wasteMovementsForPeriod(establishmentId: string, from: Date, to: Date) {
    const movements = await this.prisma.stockMovement.findMany({
      where: {
        establishmentId,
        type: "ADJUSTMENT_OUT",
        reason: { contains: "casse", mode: "insensitive" },
        createdAt: { gte: from, lte: to },
      },
      include: { product: { select: { name: true, purchasePrice: true } } },
      orderBy: { createdAt: "desc" },
    });
    const employeeIds = [
      ...new Set(
        movements
          .map((m) => m.employeeId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const employees =
      employeeIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: employeeIds } },
            select: { id: true, firstName: true, lastName: true },
          })
        : [];
    const employeeById = new Map(
      employees.map((employee) => [employee.id, employee]),
    );
    return movements.map((movement) => {
      const employee = movement.employeeId
        ? employeeById.get(movement.employeeId)
        : undefined;
      return {
        id: movement.id,
        productName: movement.product.name,
        quantity: Number(movement.quantity),
        amount:
          Number(movement.quantity) * Number(movement.product.purchasePrice),
        employeeName: employee
          ? `${employee.firstName} ${employee.lastName}`
          : "—",
        createdAt: movement.createdAt,
      };
    });
  }

  // Seuls les achats validés comptent comme approvisionnement réel — même
  // principe que sumPurchaseCost.
  async restockingForPeriod(establishmentId: string, from: Date, to: Date) {
    const purchases = await this.prisma.purchase.findMany({
      where: {
        establishmentId,
        status: "VALIDATED",
        purchaseDate: { gte: from, lte: to },
      },
      include: { supplier: { select: { name: true } } },
      orderBy: { purchaseDate: "desc" },
    });
    return purchases.map((purchase) => ({
      id: purchase.id,
      supplierName: purchase.supplier.name,
      amount: Number(purchase.totalAmount),
      createdAt: purchase.purchaseDate,
    }));
  }

  // "Acompte" = paiement encaissé pendant la période pour une commande créée
  // avant le début de cette période — distinct d'un paiement normal sur une
  // vente du jour même.
  async advancePaymentsForPeriod(
    establishmentId: string,
    from: Date,
    to: Date,
    periodStart: Date,
  ) {
    const payments = await this.prisma.payment.findMany({
      where: {
        establishmentId,
        createdAt: { gte: from, lte: to },
        order: { createdAt: { lt: periodStart } },
      },
      include: {
        paymentMethod: { select: { label: true } },
        order: { select: { orderNumber: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return payments.map((payment) => ({
      id: payment.id,
      amount: Number(payment.amount),
      createdAt: payment.createdAt,
      orderNumber: payment.order.orderNumber,
      methodLabel: payment.paymentMethod.label,
    }));
  }

  async paymentsByMethodForPeriod(
    establishmentId: string,
    from: Date,
    to: Date,
  ) {
    const rows = await this.prisma.payment.groupBy({
      by: ["paymentMethodId"],
      where: { establishmentId, createdAt: { gte: from, lte: to } },
      _sum: { amount: true },
    });
    if (rows.length === 0) return [];
    const methods = await this.prisma.paymentMethod.findMany({
      where: { id: { in: rows.map((row) => row.paymentMethodId) } },
      select: { id: true, code: true, label: true },
    });
    const methodById = new Map(methods.map((method) => [method.id, method]));
    return rows.map((row) => {
      const method = methodById.get(row.paymentMethodId);
      return {
        code: method?.code ?? "—",
        label: method?.label ?? "—",
        amount: Number(row._sum.amount ?? 0),
      };
    });
  }
}
