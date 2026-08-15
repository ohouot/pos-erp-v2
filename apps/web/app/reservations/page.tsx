"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useNestApi } from "@/hooks/useNestApi";

interface Table {
  id: string;
  name: string;
}
interface Customer {
  id: string;
  firstName: string;
  lastName: string | null;
}

interface Reservation {
  id: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
  startTime: string;
  endTime: string | null;
  partySize: number;
  notes: string | null;
  table: { name: string } | null;
  customer: { firstName: string; lastName: string | null } | null;
}

interface DraftForm {
  customerId: string;
  tableId: string;
  startTime: string;
  endTime: string;
  partySize: string;
  notes: string;
}

const EMPTY_FORM: DraftForm = {
  customerId: "",
  tableId: "",
  startTime: "",
  endTime: "",
  partySize: "1",
  notes: "",
};

const STATUS_LABEL: Record<Reservation["status"], string> = {
  PENDING: "En attente",
  CONFIRMED: "Confirmée",
  CANCELLED: "Annulée",
  COMPLETED: "Terminée",
  NO_SHOW: "Absence",
};

const STATUS_STYLE: Record<Reservation["status"], string> = {
  PENDING: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  CANCELLED: "bg-neutral-100 text-neutral-500",
  COMPLETED: "bg-green-100 text-green-800",
  NO_SHOW: "bg-red-100 text-red-800",
};

export default function ReservationsPage() {
  const { data: session } = useSession();
  const { authFetch } = useNestApi();

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<DraftForm>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const canCreate =
    session?.user.permissions.includes("reservations:create") ?? false;
  const canUpdate =
    session?.user.permissions.includes("reservations:update") ?? false;
  const canCancel =
    session?.user.permissions.includes("reservations:cancel") ?? false;

  const loadReservations = useCallback(async () => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    const res = await authFetch(`/reservations?${params.toString()}`);
    if (!res.ok) return;
    const data = (await res.json()) as { reservations: Reservation[] };
    setReservations(data.reservations);
  }, [authFetch, statusFilter]);

  useEffect(() => {
    Promise.all([
      authFetch("/tables").then((r) => r.json()),
      authFetch("/customers?pageSize=200").then((r) => r.json()),
    ]).then(([t, c]) => {
      setTables(t.tables);
      setCustomers(c.customers);
    });
  }, [authFetch]);

  useEffect(() => {
    loadReservations();
  }, [loadReservations]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowForm(true);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    const res = await authFetch("/reservations", {
      method: "POST",
      body: JSON.stringify({
        customerId: form.customerId || undefined,
        tableId: form.tableId || undefined,
        startTime: new Date(form.startTime).toISOString(),
        endTime: form.endTime
          ? new Date(form.endTime).toISOString()
          : undefined,
        partySize: Number(form.partySize) || 1,
        notes: form.notes || undefined,
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
    loadReservations();
  }

  async function transition(
    id: string,
    action: "confirm" | "complete" | "cancel" | "no-show",
  ) {
    await authFetch(`/reservations/${id}/${action}`, { method: "POST" });
    loadReservations();
  }

  return (
    <main className="flex min-h-screen flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Réservations</h1>
        <Link href="/" className="text-sm text-neutral-500 hover:underline">
          ← Tableau de bord
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded border border-neutral-300 px-3 py-1.5 text-sm"
        >
          <option value="">Tous les statuts</option>
          {(Object.keys(STATUS_LABEL) as Reservation["status"][]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        {canCreate && (
          <button
            onClick={openCreate}
            className="ml-auto rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white"
          >
            Nouvelle réservation
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
              <label className="text-xs font-medium">Client (optionnel)</label>
              <select
                value={form.customerId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, customerId: e.target.value }))
                }
                className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
              >
                <option value="">—</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName ?? ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Table (optionnel)</label>
              <select
                value={form.tableId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, tableId: e.target.value }))
                }
                className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
              >
                <option value="">—</option>
                {tables.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Début</label>
              <input
                type="datetime-local"
                required
                value={form.startTime}
                onChange={(e) =>
                  setForm((f) => ({ ...f, startTime: e.target.value }))
                }
                className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Fin (optionnel)</label>
              <input
                type="datetime-local"
                value={form.endTime}
                onChange={(e) =>
                  setForm((f) => ({ ...f, endTime: e.target.value }))
                }
                className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Nombre de personnes</label>
              <input
                type="number"
                min={1}
                value={form.partySize}
                onChange={(e) =>
                  setForm((f) => ({ ...f, partySize: e.target.value }))
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
              <th className="px-3 py-2">Début</th>
              <th className="px-3 py-2">Client</th>
              <th className="px-3 py-2">Table</th>
              <th className="px-3 py-2">Personnes</th>
              <th className="px-3 py-2">Statut</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {reservations.map((r) => (
              <tr key={r.id}>
                <td className="px-3 py-2">
                  {new Date(r.startTime).toLocaleString("fr-FR")}
                </td>
                <td className="px-3 py-2">
                  {r.customer
                    ? `${r.customer.firstName} ${r.customer.lastName ?? ""}`
                    : "—"}
                </td>
                <td className="px-3 py-2">{r.table?.name ?? "—"}</td>
                <td className="px-3 py-2">{r.partySize}</td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded px-2 py-0.5 ${STATUS_STYLE[r.status]}`}
                  >
                    {STATUS_LABEL[r.status]}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="flex justify-end gap-2">
                    {canUpdate && r.status === "PENDING" && (
                      <button
                        onClick={() => transition(r.id, "confirm")}
                        className="text-xs text-blue-700 hover:underline"
                      >
                        Confirmer
                      </button>
                    )}
                    {canUpdate && r.status === "CONFIRMED" && (
                      <button
                        onClick={() => transition(r.id, "complete")}
                        className="text-xs text-green-700 hover:underline"
                      >
                        Clôturer
                      </button>
                    )}
                    {canUpdate &&
                      (r.status === "PENDING" || r.status === "CONFIRMED") && (
                        <button
                          onClick={() => transition(r.id, "no-show")}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Absence
                        </button>
                      )}
                    {canCancel &&
                      (r.status === "PENDING" || r.status === "CONFIRMED") && (
                        <button
                          onClick={() => transition(r.id, "cancel")}
                          className="text-xs text-neutral-600 hover:underline"
                        >
                          Annuler
                        </button>
                      )}
                  </div>
                </td>
              </tr>
            ))}
            {reservations.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-6 text-center text-neutral-500"
                >
                  Aucune réservation.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
