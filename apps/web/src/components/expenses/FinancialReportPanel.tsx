"use client";

import { useCallback, useEffect, useState } from "react";
import { useNestApi } from "@/hooks/useNestApi";

interface FinancialSummary {
  from: string;
  to: string;
  revenue: string;
  purchaseCost: string;
  expenses: string;
  grossMargin: string;
  grossMarginPercent: string;
  netResult: string;
  expensesByCategory: {
    categoryId: string;
    categoryName: string;
    total: string;
  }[];
}

function startOfMonthInput(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
}

function todayInput(): string {
  return new Date().toISOString().slice(0, 10);
}

function money(value: string): string {
  return (
    Number(value).toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " XOF"
  );
}

export function FinancialReportPanel({ canExport }: { canExport: boolean }) {
  const { authFetch } = useNestApi();
  const [from, setFrom] = useState(startOfMonthInput());
  const [to, setTo] = useState(todayInput());
  const [summary, setSummary] = useState<FinancialSummary | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams({
      from: `${from}T00:00:00.000Z`,
      to: `${to}T23:59:59.999Z`,
    });
    const res = await authFetch(
      `/reports/financial-summary?${params.toString()}`,
    );
    if (!res.ok) return;
    const data = (await res.json()) as { summary: FinancialSummary };
    setSummary(data.summary);
  }, [authFetch, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleExportCsv() {
    const params = new URLSearchParams({
      from: `${from}T00:00:00.000Z`,
      to: `${to}T23:59:59.999Z`,
    });
    const res = await authFetch(
      `/reports/financial-summary/export?${params.toString()}`,
    );
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rapport-financier.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const netNegative = summary ? Number(summary.netResult) < 0 : false;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <label className="flex items-center gap-2 text-sm">
          Du
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded border border-neutral-300 px-2 py-1 text-sm"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          Au
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded border border-neutral-300 px-2 py-1 text-sm"
          />
        </label>
        <div className="ml-auto flex gap-2">
          {canExport && (
            <button
              onClick={handleExportCsv}
              className="rounded border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100"
            >
              Exporter CSV
            </button>
          )}
          <button
            onClick={() => window.print()}
            className="rounded border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100"
          >
            Imprimer / PDF
          </button>
        </div>
      </div>

      {summary && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded border border-neutral-200 p-3">
              <p className="text-xs text-neutral-500">
                Chiffre d&apos;affaires
              </p>
              <p className="text-lg font-semibold">{money(summary.revenue)}</p>
            </div>
            <div className="rounded border border-neutral-200 p-3">
              <p className="text-xs text-neutral-500">Coût des achats</p>
              <p className="text-lg font-semibold">
                {money(summary.purchaseCost)}
              </p>
            </div>
            <div className="rounded border border-neutral-200 p-3">
              <p className="text-xs text-neutral-500">Dépenses</p>
              <p className="text-lg font-semibold">{money(summary.expenses)}</p>
            </div>
            <div className="rounded border border-neutral-200 p-3">
              <p className="text-xs text-neutral-500">Marge brute</p>
              <p className="text-lg font-semibold">
                {money(summary.grossMargin)}
              </p>
            </div>
            <div className="rounded border border-neutral-200 p-3">
              <p className="text-xs text-neutral-500">Marge brute (%)</p>
              <p className="text-lg font-semibold">
                {Number(summary.grossMarginPercent).toFixed(1)}%
              </p>
            </div>
            <div
              className={`rounded border p-3 ${netNegative ? "border-red-300 bg-red-50" : "border-neutral-200"}`}
            >
              <p className="text-xs text-neutral-500">Résultat net</p>
              <p
                className={`text-lg font-semibold ${netNegative ? "text-red-700" : ""}`}
              >
                {money(summary.netResult)}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-neutral-500">
              Dépenses par catégorie
            </h2>
            <div className="overflow-x-auto rounded border border-neutral-200">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500">
                  <tr>
                    <th className="px-3 py-2">Catégorie</th>
                    <th className="px-3 py-2">Montant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {summary.expensesByCategory.map((row) => (
                    <tr key={row.categoryId}>
                      <td className="px-3 py-2">{row.categoryName}</td>
                      <td className="px-3 py-2">{money(row.total)}</td>
                    </tr>
                  ))}
                  {summary.expensesByCategory.length === 0 && (
                    <tr>
                      <td
                        colSpan={2}
                        className="px-3 py-4 text-center text-neutral-500"
                      >
                        Aucune dépense sur la période.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
