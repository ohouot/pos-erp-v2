"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useNestApi } from "@/hooks/useNestApi";
import { ExpenseCategoriesPanel } from "@/components/expenses/ExpenseCategoriesPanel";
import { FinancialReportPanel } from "@/components/expenses/FinancialReportPanel";

interface ExpenseCategory {
  id: string;
  name: string;
}

interface Expense {
  id: string;
  amount: string;
  description: string | null;
  expenseDate: string;
  category: { name: string };
}

interface DraftForm {
  categoryId: string;
  amount: string;
  description: string;
  expenseDate: string;
}

const EMPTY_FORM: DraftForm = {
  categoryId: "",
  amount: "",
  description: "",
  expenseDate: "",
};
const PAGE_SIZE = 20;

export default function ExpensesPage() {
  const { data: session } = useSession();
  const { authFetch } = useNestApi();

  const [view, setView] = useState<"expenses" | "categories" | "report">(
    "expenses",
  );
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<DraftForm>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const canCreate =
    session?.user.permissions.includes("expenses:create") ?? false;
  const canDelete =
    session?.user.permissions.includes("expenses:delete") ?? false;
  const canManageCategories =
    session?.user.permissions.includes("expenses:create") ?? false;

  const loadExpenses = useCallback(async () => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
    });
    if (categoryFilter) params.set("categoryId", categoryFilter);
    const res = await authFetch(`/expenses?${params.toString()}`);
    if (!res.ok) return;
    const data = (await res.json()) as {
      expenses: Expense[];
      meta: typeof meta;
    };
    setExpenses(data.expenses);
    setMeta(data.meta);
  }, [authFetch, page, categoryFilter]);

  useEffect(() => {
    authFetch("/expense-categories")
      .then((res) => res.json())
      .then((data: { expenseCategories: ExpenseCategory[] }) =>
        setCategories(data.expenseCategories),
      )
      .catch(() => setCategories([]));
  }, [authFetch]);

  useEffect(() => {
    if (view === "expenses") loadExpenses();
  }, [view, loadExpenses]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowForm(true);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    const res = await authFetch("/expenses", {
      method: "POST",
      body: JSON.stringify({
        categoryId: form.categoryId,
        amount: Number(form.amount),
        description: form.description || undefined,
        expenseDate: form.expenseDate
          ? new Date(form.expenseDate).toISOString()
          : undefined,
      }),
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => null);
      setFormError(
        Array.isArray(errBody?.message)
          ? errBody.message.join(", ")
          : (errBody?.message ?? "Échec de la création"),
      );
      return;
    }
    setShowForm(false);
    loadExpenses();
  }

  async function handleDelete(id: string) {
    await authFetch(`/expenses/${id}`, { method: "DELETE" });
    loadExpenses();
  }

  return (
    <main className="flex min-h-screen flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dépenses</h1>
        <Link href="/" className="text-sm text-neutral-500 hover:underline">
          ← Tableau de bord
        </Link>
      </div>

      <div className="flex gap-2 border-b border-neutral-200 print:hidden">
        {(["expenses", "categories", "report"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setView(tab)}
            className={`px-4 py-2 text-sm font-medium ${
              view === tab
                ? "border-b-2 border-neutral-900 text-neutral-900"
                : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            {tab === "expenses"
              ? "Dépenses"
              : tab === "categories"
                ? "Catégories"
                : "Rapport financier"}
          </button>
        ))}
      </div>

      {view === "categories" && (
        <ExpenseCategoriesPanel canManage={canManageCategories} />
      )}
      {view === "report" &&
        (session?.user.permissions.includes("reports:read") ? (
          <FinancialReportPanel
            canExport={
              session?.user.permissions.includes("reports:export") ?? false
            }
          />
        ) : (
          <p className="text-sm text-neutral-500">
            Vous n&apos;avez pas la permission de consulter les rapports.
          </p>
        ))}

      {view === "expenses" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="rounded border border-neutral-300 px-3 py-1.5 text-sm"
            >
              <option value="">Toutes les catégories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {canCreate && (
              <button
                onClick={openCreate}
                className="ml-auto rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white"
              >
                Nouvelle dépense
              </button>
            )}
          </div>

          {showForm && (
            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-4 rounded border border-neutral-300 p-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium">Catégorie</label>
                  <select
                    required
                    value={form.categoryId}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, categoryId: e.target.value }))
                    }
                    className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
                  >
                    <option value="">—</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium">Montant</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={form.amount}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, amount: e.target.value }))
                    }
                    className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium">
                    Date (optionnel)
                  </label>
                  <input
                    type="date"
                    value={form.expenseDate}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, expenseDate: e.target.value }))
                    }
                    className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
                  />
                </div>
                <div className="col-span-2 flex flex-col gap-1">
                  <label className="text-xs font-medium">Description</label>
                  <input
                    value={form.description}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, description: e.target.value }))
                    }
                    className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
                  />
                </div>
              </div>
              {formError && <p className="text-sm text-red-600">{formError}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="w-fit rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
                >
                  Créer
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="w-fit rounded border border-neutral-300 px-4 py-2 text-sm"
                >
                  Annuler
                </button>
              </div>
            </form>
          )}

          <div className="overflow-x-auto rounded border border-neutral-200">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500">
                <tr>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Catégorie</th>
                  <th className="px-3 py-2">Description</th>
                  <th className="px-3 py-2">Montant</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {expenses.map((e) => (
                  <tr key={e.id}>
                    <td className="px-3 py-2">
                      {new Date(e.expenseDate).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-3 py-2">{e.category.name}</td>
                    <td className="px-3 py-2">{e.description ?? "—"}</td>
                    <td className="px-3 py-2">{e.amount}</td>
                    <td className="px-3 py-2 text-right">
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(e.id)}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Supprimer
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {expenses.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-6 text-center text-neutral-500"
                    >
                      Aucune dépense.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {meta.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 text-sm">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded border border-neutral-300 px-3 py-1 disabled:opacity-50"
              >
                Précédent
              </button>
              <span>
                Page {meta.page} / {meta.totalPages} ({meta.total} dépenses)
              </span>
              <button
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={page >= meta.totalPages}
                className="rounded border border-neutral-300 px-3 py-1 disabled:opacity-50"
              >
                Suivant
              </button>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
