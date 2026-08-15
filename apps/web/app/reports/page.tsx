"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useNestApi } from "@/hooks/useNestApi";
import { AnimatedNumber } from "@/components/AnimatedNumber";

interface CountAmountRows<T> {
  count: number;
  amount: string;
  rows: T[];
}

interface DailyReportSummary {
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
  advancePayments: CountAmountRows<{
    id: string;
    amount: string;
    createdAt: string;
    orderNumber: string;
    methodLabel: string;
  }>;
  cancellations: CountAmountRows<{
    id: string;
    orderNumber: string;
    amount: string;
    employeeName: string;
    createdAt: string;
  }>;
  waste: CountAmountRows<{
    id: string;
    productName: string;
    quantity: string;
    amount: string;
    employeeName: string;
    createdAt: string;
  }>;
  restocking: CountAmountRows<{
    id: string;
    supplierName: string;
    amount: string;
    createdAt: string;
  }>;
  paymentsByMethod: { code: string; label: string; amount: string }[];
}

const CHART_COLORS = [
  "hsl(27 87% 58%)",
  "#22c55e",
  "#0ea5e9",
  "#8b5cf6",
  "#f59e0b",
  "#ef4444",
  "#14b8a6",
];

function money(n: number): string {
  return n.toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " XOF";
}

function formatDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default function DailyReportPage() {
  const { data: session } = useSession();
  const { authFetch } = useNestApi();

  const canRead = session?.user.permissions.includes("reports:read") ?? false;

  const [date, setDate] = useState(formatDateInput(new Date()));
  const [summary, setSummary] = useState<DailyReportSummary | null>(null);

  const load = useCallback(async () => {
    if (!canRead) return;
    const res = await authFetch(`/reports/daily?date=${date}T12:00:00.000Z`);
    if (!res.ok) return;
    const data = (await res.json()) as { summary: DailyReportSummary };
    setSummary(data.summary);
  }, [authFetch, date, canRead]);

  useEffect(() => {
    load();
  }, [load]);

  if (!canRead) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-lg font-semibold">Accès refusé</p>
        <p className="text-sm text-neutral-500">
          Vous n&apos;avez pas la permission de consulter les rapports.
        </p>
        <Link href="/" className="text-sm text-neutral-500 hover:underline">
          ← Tableau de bord
        </Link>
      </main>
    );
  }

  const kpis: { label: string; value: string }[] = summary
    ? [
        { label: "Ventes", value: summary.totalSales },
        { label: "Remises", value: summary.totalDiscount },
        { label: "À payer", value: summary.totalToPay },
        { label: "Paiements encaissés", value: summary.totalPayments },
        { label: "Reste dû (global)", value: summary.totalRemaining },
        { label: "Bénéfice", value: summary.totalProfit },
        { label: "Dépôts caisse", value: summary.cashDeposits },
        { label: "Retraits caisse", value: summary.cashWithdrawals },
        {
          label: "Bénéfice net charges",
          value: summary.totalProfitMinusCharges,
        },
      ]
    : [];

  const overviewChartData = summary
    ? [
        { name: "Ventes", montant: Number(summary.totalSales) },
        { name: "Remises", montant: Number(summary.totalDiscount) },
        { name: "Paiements", montant: Number(summary.totalPayments) },
        { name: "Bénéfice", montant: Number(summary.totalProfit) },
      ]
    : [];

  return (
    <main className="flex min-h-screen flex-col gap-6 p-8">
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-2xl font-semibold">Rapport de clôture</h1>
        <Link href="/" className="text-sm text-neutral-500 hover:underline">
          ← Tableau de bord
        </Link>
      </div>

      <div className="flex items-center gap-3 print:hidden">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded border border-neutral-300 px-3 py-1.5 text-sm"
        />
        <button
          onClick={() => window.print()}
          className="ml-auto rounded border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100"
        >
          Imprimer
        </button>
      </div>

      {summary && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {kpis.map((kpi) => (
              <div
                key={kpi.label}
                className="rounded border border-neutral-200 p-3"
              >
                <p className="text-xs text-neutral-500">{kpi.label}</p>
                <p className="text-lg font-semibold">
                  <AnimatedNumber value={Number(kpi.value)} format={money} />
                </p>
              </div>
            ))}
            <div className="rounded border border-neutral-200 p-3">
              <p className="text-xs text-neutral-500">Nombre de ventes</p>
              <p className="text-lg font-semibold">{summary.saleCount}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="h-64 rounded border border-neutral-200 p-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={overviewChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis
                    tickFormatter={(v: number) => v.toLocaleString("fr-FR")}
                  />
                  <Tooltip formatter={(v) => money(Number(v))} />
                  <Bar
                    dataKey="montant"
                    fill="hsl(27 87% 58%)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="h-64 rounded border border-neutral-200 p-3">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={summary.paymentsByMethod.map((m) => ({
                      name: m.label,
                      value: Number(m.amount),
                    }))}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {summary.paymentsByMethod.map((_, i) => (
                      <Cell
                        key={i}
                        fill={CHART_COLORS[i % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip formatter={(v) => money(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
              {summary.paymentsByMethod.length === 0 && (
                <p className="text-center text-sm text-neutral-500">
                  Aucun paiement.
                </p>
              )}
            </div>
          </div>

          <ReportTable
            title={`Acomptes (${summary.advancePayments.count})`}
            headers={["Commande", "Mode", "Montant", "Date"]}
            rows={summary.advancePayments.rows.map((r) => [
              r.orderNumber,
              r.methodLabel,
              money(Number(r.amount)),
              new Date(r.createdAt).toLocaleString("fr-FR"),
            ])}
          />
          <ReportTable
            title={`Annulations (${summary.cancellations.count})`}
            headers={["Commande", "Employé", "Montant", "Date"]}
            rows={summary.cancellations.rows.map((r) => [
              r.orderNumber,
              r.employeeName,
              money(Number(r.amount)),
              new Date(r.createdAt).toLocaleString("fr-FR"),
            ])}
          />
          <ReportTable
            title={`Casse (${summary.waste.count})`}
            headers={["Produit", "Quantité", "Montant", "Employé", "Date"]}
            rows={summary.waste.rows.map((r) => [
              r.productName,
              r.quantity,
              money(Number(r.amount)),
              r.employeeName,
              new Date(r.createdAt).toLocaleString("fr-FR"),
            ])}
          />
          <ReportTable
            title={`Approvisionnements (${summary.restocking.count})`}
            headers={["Fournisseur", "Montant", "Date"]}
            rows={summary.restocking.rows.map((r) => [
              r.supplierName,
              money(Number(r.amount)),
              new Date(r.createdAt).toLocaleString("fr-FR"),
            ])}
          />
        </>
      )}
    </main>
  );
}

function ReportTable({
  title,
  headers,
  rows,
}: {
  title: string;
  headers: string[];
  rows: string[][];
}) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-medium text-neutral-500">{title}</h2>
      <div className="overflow-x-auto rounded border border-neutral-200">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500">
            <tr>
              {headers.map((h) => (
                <th key={h} className="px-3 py-2">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j} className="px-3 py-2">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={headers.length}
                  className="px-3 py-4 text-center text-neutral-500"
                >
                  Aucune entrée.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
