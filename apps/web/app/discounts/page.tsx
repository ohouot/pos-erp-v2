"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useNestApi } from "@/hooks/useNestApi";

interface Discount {
  id: string;
  name: string;
  type: "PERCENTAGE" | "FIXED";
  value: string;
  code: string | null;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
}

interface DraftForm {
  name: string;
  type: "PERCENTAGE" | "FIXED";
  value: string;
  code: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

const EMPTY_FORM: DraftForm = {
  name: "",
  type: "PERCENTAGE",
  value: "",
  code: "",
  startDate: "",
  endDate: "",
  isActive: true,
};

export default function DiscountsPage() {
  const { data: session } = useSession();
  const { authFetch } = useNestApi();

  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DraftForm>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const canCreate =
    session?.user.permissions.includes("discounts:create") ?? false;
  const canUpdate =
    session?.user.permissions.includes("discounts:update") ?? false;
  const canDelete =
    session?.user.permissions.includes("discounts:delete") ?? false;

  const loadDiscounts = useCallback(async () => {
    const res = await authFetch("/discounts");
    if (!res.ok) return;
    const data = (await res.json()) as { discounts: Discount[] };
    setDiscounts(data.discounts);
  }, [authFetch]);

  useEffect(() => {
    loadDiscounts();
  }, [loadDiscounts]);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(d: Discount) {
    setEditingId(d.id);
    setForm({
      name: d.name,
      type: d.type,
      value: d.value,
      code: d.code ?? "",
      startDate: d.startDate ? d.startDate.slice(0, 10) : "",
      endDate: d.endDate ? d.endDate.slice(0, 10) : "",
      isActive: d.isActive,
    });
    setFormError(null);
    setShowForm(true);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    const body = {
      name: form.name,
      type: form.type,
      value: Number(form.value),
      code: form.code || undefined,
      startDate: form.startDate
        ? new Date(form.startDate).toISOString()
        : undefined,
      endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
      ...(editingId ? { isActive: form.isActive } : {}),
    };
    const res = await authFetch(
      editingId ? `/discounts/${editingId}` : "/discounts",
      {
        method: editingId ? "PATCH" : "POST",
        body: JSON.stringify(body),
      },
    );
    if (!res.ok) {
      const errBody = await res.json().catch(() => null);
      setFormError(
        Array.isArray(errBody?.message)
          ? errBody.message.join(", ")
          : (errBody?.message ?? "Échec de l'enregistrement"),
      );
      return;
    }
    setShowForm(false);
    loadDiscounts();
  }

  async function handleDelete(id: string) {
    await authFetch(`/discounts/${id}`, { method: "DELETE" });
    loadDiscounts();
  }

  async function toggleActive(d: Discount) {
    await authFetch(`/discounts/${d.id}`, {
      method: "PATCH",
      body: JSON.stringify({ isActive: !d.isActive }),
    });
    loadDiscounts();
  }

  return (
    <main className="flex min-h-screen flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Remises</h1>
        <Link href="/" className="text-sm text-neutral-500 hover:underline">
          ← Tableau de bord
        </Link>
      </div>

      {canCreate && (
        <div>
          <button
            onClick={openCreate}
            className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white"
          >
            Nouvelle remise
          </button>
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded border border-neutral-300 p-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Nom</label>
              <input
                required
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Code (optionnel)</label>
              <input
                value={form.code}
                onChange={(e) =>
                  setForm((f) => ({ ...f, code: e.target.value }))
                }
                className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Type</label>
              <select
                value={form.type}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    type: e.target.value as "PERCENTAGE" | "FIXED",
                  }))
                }
                className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
              >
                <option value="PERCENTAGE">Pourcentage</option>
                <option value="FIXED">Montant fixe</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">
                Valeur {form.type === "PERCENTAGE" ? "(%)" : "(montant)"}
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={form.value}
                onChange={(e) =>
                  setForm((f) => ({ ...f, value: e.target.value }))
                }
                className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Début (optionnel)</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, startDate: e.target.value }))
                }
                className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Fin (optionnel)</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, endDate: e.target.value }))
                }
                className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
              />
            </div>
            {editingId && (
              <label className="flex items-center gap-2 text-xs font-medium">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, isActive: e.target.checked }))
                  }
                />
                Active
              </label>
            )}
          </div>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              className="w-fit rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
            >
              {editingId ? "Enregistrer" : "Créer"}
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
              <th className="px-3 py-2">Nom</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Valeur</th>
              <th className="px-3 py-2">Code</th>
              <th className="px-3 py-2">Période</th>
              <th className="px-3 py-2">Statut</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {discounts.map((d) => (
              <tr key={d.id}>
                <td className="px-3 py-2 font-medium">{d.name}</td>
                <td className="px-3 py-2">
                  {d.type === "PERCENTAGE" ? "Pourcentage" : "Fixe"}
                </td>
                <td className="px-3 py-2">
                  {d.type === "PERCENTAGE" ? `${d.value}%` : d.value}
                </td>
                <td className="px-3 py-2">{d.code ?? "—"}</td>
                <td className="px-3 py-2 text-xs text-neutral-500">
                  {d.startDate
                    ? new Date(d.startDate).toLocaleDateString("fr-FR")
                    : "—"}{" "}
                  →{" "}
                  {d.endDate
                    ? new Date(d.endDate).toLocaleDateString("fr-FR")
                    : "—"}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={
                      d.isActive
                        ? "rounded bg-green-100 px-2 py-0.5 text-green-800"
                        : "rounded bg-neutral-100 px-2 py-0.5 text-neutral-500"
                    }
                  >
                    {d.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="flex justify-end gap-2">
                    {canUpdate && (
                      <>
                        <button
                          onClick={() => toggleActive(d)}
                          className="text-xs text-neutral-600 hover:underline"
                        >
                          {d.isActive ? "Désactiver" : "Activer"}
                        </button>
                        <button
                          onClick={() => openEdit(d)}
                          className="text-xs text-neutral-600 hover:underline"
                        >
                          Modifier
                        </button>
                      </>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(d.id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Supprimer
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {discounts.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-6 text-center text-neutral-500"
                >
                  Aucune remise.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
