"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useNestApi } from "@/hooks/useNestApi";

interface PaymentMethod {
  id: string;
  code: string;
  label: string;
  displayOrder: number;
  isActive: boolean;
}

export default function PaymentMethodsPage() {
  const { data: session } = useSession();
  const { authFetch } = useNestApi();

  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: "", label: "", displayOrder: "0" });
  const [error, setError] = useState<string | null>(null);

  const canCreate =
    session?.user.permissions.includes("paymentMethods:create") ?? false;
  const canUpdate =
    session?.user.permissions.includes("paymentMethods:update") ?? false;
  const canDelete =
    session?.user.permissions.includes("paymentMethods:delete") ?? false;

  const load = useCallback(async () => {
    const res = await authFetch("/payment-methods");
    if (!res.ok) return;
    const data = (await res.json()) as { paymentMethods: PaymentMethod[] };
    setMethods(data.paymentMethods);
  }, [authFetch]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const res = await authFetch("/payment-methods", {
      method: "POST",
      body: JSON.stringify({
        ...form,
        displayOrder: Number(form.displayOrder),
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.message ?? "Échec de la création");
      return;
    }
    setForm({ code: "", label: "", displayOrder: "0" });
    setShowForm(false);
    load();
  }

  async function handleToggleActive(m: PaymentMethod) {
    await authFetch(`/payment-methods/${m.id}`, {
      method: "PATCH",
      body: JSON.stringify({ isActive: !m.isActive }),
    });
    load();
  }

  async function handleDelete(id: string) {
    setError(null);
    const res = await authFetch(`/payment-methods/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.message ?? "Échec de la suppression");
      return;
    }
    load();
  }

  return (
    <main className="flex min-h-screen flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Modes de paiement</h1>
        <Link href="/" className="text-sm text-neutral-500 hover:underline">
          ← Tableau de bord
        </Link>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {canCreate && (
        <div>
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white"
            >
              Nouveau moyen de paiement
            </button>
          ) : (
            <form
              onSubmit={handleCreate}
              className="flex flex-wrap items-end gap-3 rounded border border-neutral-300 p-3"
            >
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">Code (majuscules)</label>
                <input
                  required
                  value={form.code}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      code: e.target.value.toUpperCase(),
                    }))
                  }
                  className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">Libellé</label>
                <input
                  required
                  value={form.label}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, label: e.target.value }))
                  }
                  className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">Ordre</label>
                <input
                  type="number"
                  value={form.displayOrder}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, displayOrder: e.target.value }))
                  }
                  className="w-20 rounded border border-neutral-300 px-2 py-1.5 text-sm"
                />
              </div>
              <button
                type="submit"
                className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white"
              >
                Créer
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-sm text-neutral-500"
              >
                Annuler
              </button>
            </form>
          )}
        </div>
      )}

      <ul className="flex flex-col divide-y divide-neutral-200 rounded border border-neutral-200">
        {methods.map((m) => (
          <li key={m.id} className="flex items-center gap-3 px-3 py-2 text-sm">
            <span className="font-mono text-xs text-neutral-500">{m.code}</span>
            <span>{m.label}</span>
            <span
              className={`rounded px-2 py-0.5 text-xs ${m.isActive ? "bg-green-100 text-green-800" : "bg-neutral-100 text-neutral-500"}`}
            >
              {m.isActive ? "Actif" : "Désactivé"}
            </span>
            <div className="ml-auto flex gap-3">
              {canUpdate && (
                <button
                  onClick={() => handleToggleActive(m)}
                  className="text-xs text-neutral-600 hover:underline"
                >
                  {m.isActive ? "Désactiver" : "Activer"}
                </button>
              )}
              {canDelete && (
                <button
                  onClick={() => handleDelete(m.id)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Supprimer
                </button>
              )}
            </div>
          </li>
        ))}
        {methods.length === 0 && (
          <li className="px-3 py-4 text-center text-sm text-neutral-500">
            Aucun moyen de paiement.
          </li>
        )}
      </ul>
    </main>
  );
}
