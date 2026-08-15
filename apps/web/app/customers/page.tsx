"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useNestApi } from "@/hooks/useNestApi";

interface Customer {
  id: string;
  firstName: string;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  loyaltyPoints: number;
  totalSpent: string;
  isActive: boolean;
}

interface OrderHistoryItem {
  id: string;
  invoiceNumber: number | null;
  closedAt: string | null;
  totalAmount: string;
  items: { product: { name: string } }[];
}

interface DraftForm {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
}

const EMPTY_FORM: DraftForm = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
};
const PAGE_SIZE = 20;

export default function CustomersPage() {
  const { data: session } = useSession();
  const { authFetch } = useNestApi();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DraftForm>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [historyFor, setHistoryFor] = useState<Customer | null>(null);
  const [history, setHistory] = useState<OrderHistoryItem[]>([]);

  const canCreate =
    session?.user.permissions.includes("customers:create") ?? false;
  const canUpdate =
    session?.user.permissions.includes("customers:update") ?? false;
  const canDelete =
    session?.user.permissions.includes("customers:delete") ?? false;

  const loadCustomers = useCallback(async () => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
    });
    if (search) params.set("search", search);
    const res = await authFetch(`/customers?${params.toString()}`);
    if (!res.ok) return;
    const data = (await res.json()) as {
      customers: Customer[];
      meta: typeof meta;
    };
    setCustomers(data.customers);
    setMeta(data.meta);
  }, [authFetch, page, search]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(c: Customer) {
    setEditingId(c.id);
    setForm({
      firstName: c.firstName,
      lastName: c.lastName ?? "",
      phone: c.phone ?? "",
      email: c.email ?? "",
      address: c.address ?? "",
      notes: c.notes ?? "",
    });
    setFormError(null);
    setShowForm(true);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    const body = {
      firstName: form.firstName,
      lastName: form.lastName || undefined,
      phone: form.phone || undefined,
      email: form.email || undefined,
      address: form.address || undefined,
      notes: form.notes || undefined,
    };
    const res = await authFetch(
      editingId ? `/customers/${editingId}` : "/customers",
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
    loadCustomers();
  }

  async function handleDelete(id: string) {
    await authFetch(`/customers/${id}`, { method: "DELETE" });
    loadCustomers();
  }

  async function openHistory(c: Customer) {
    setHistoryFor(c);
    const res = await authFetch(`/customers/${c.id}/orders`);
    if (!res.ok) return;
    const data = (await res.json()) as { orders: OrderHistoryItem[] };
    setHistory(data.orders);
  }

  return (
    <main className="flex min-h-screen flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Clients</h1>
        <Link href="/" className="text-sm text-neutral-500 hover:underline">
          ← Tableau de bord
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <input
          placeholder="Rechercher (nom ou téléphone)..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-64 rounded border border-neutral-300 px-3 py-1.5 text-sm"
        />
        {canCreate && (
          <button
            onClick={openCreate}
            className="ml-auto rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white"
          >
            Nouveau client
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
              <label className="text-xs font-medium">Prénom</label>
              <input
                required
                value={form.firstName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, firstName: e.target.value }))
                }
                className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Nom</label>
              <input
                value={form.lastName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, lastName: e.target.value }))
                }
                className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Téléphone</label>
              <input
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
                className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
                className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div className="col-span-2 flex flex-col gap-1">
              <label className="text-xs font-medium">Adresse</label>
              <input
                value={form.address}
                onChange={(e) =>
                  setForm((f) => ({ ...f, address: e.target.value }))
                }
                className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div className="col-span-2 flex flex-col gap-1">
              <label className="text-xs font-medium">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
                rows={2}
              />
            </div>
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
              <th className="px-3 py-2">Téléphone</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Points fidélité</th>
              <th className="px-3 py-2">Total dépensé</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {customers.map((c) => (
              <tr key={c.id}>
                <td className="px-3 py-2">
                  <button
                    onClick={() => openHistory(c)}
                    className="font-medium hover:underline"
                  >
                    {c.firstName} {c.lastName ?? ""}
                  </button>
                </td>
                <td className="px-3 py-2">{c.phone ?? "—"}</td>
                <td className="px-3 py-2">{c.email ?? "—"}</td>
                <td className="px-3 py-2">{c.loyaltyPoints}</td>
                <td className="px-3 py-2">{c.totalSpent}</td>
                <td className="px-3 py-2 text-right">
                  <div className="flex justify-end gap-2">
                    {canUpdate && (
                      <button
                        onClick={() => openEdit(c)}
                        className="text-xs text-neutral-600 hover:underline"
                      >
                        Modifier
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Supprimer
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-6 text-center text-neutral-500"
                >
                  Aucun client.
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
            Page {meta.page} / {meta.totalPages} ({meta.total} clients)
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

      {historyFor && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/40 p-8"
          onClick={() => setHistoryFor(null)}
        >
          <div
            className="max-h-full w-full max-w-2xl overflow-y-auto rounded bg-white p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                Historique — {historyFor.firstName} {historyFor.lastName ?? ""}
              </h2>
              <button
                onClick={() => setHistoryFor(null)}
                className="text-sm text-neutral-500 hover:underline"
              >
                Fermer
              </button>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500">
                <tr>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Facture</th>
                  <th className="px-3 py-2">Articles</th>
                  <th className="px-3 py-2">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {history.map((o) => (
                  <tr key={o.id}>
                    <td className="px-3 py-2">
                      {o.closedAt
                        ? new Date(o.closedAt).toLocaleDateString("fr-FR")
                        : "—"}
                    </td>
                    <td className="px-3 py-2">{o.invoiceNumber ?? "—"}</td>
                    <td className="px-3 py-2">
                      {o.items.map((i) => i.product.name).join(", ")}
                    </td>
                    <td className="px-3 py-2">{o.totalAmount}</td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-6 text-center text-neutral-500"
                    >
                      Aucun achat.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
