"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useNestApi } from "@/hooks/useNestApi";
import { useRealtimeSocket } from "@/hooks/useRealtimeSocket";

type TableStatus = "FREE" | "OCCUPIED" | "RESERVED" | "CLEANING";

interface Table {
  id: string;
  name: string;
  capacity: number;
  zone: string | null;
  status: TableStatus;
}

const STATUS_STYLES: Record<TableStatus, string> = {
  FREE: "border-green-400 bg-green-50 text-green-800",
  OCCUPIED: "border-red-400 bg-red-50 text-red-800",
  RESERVED: "border-amber-400 bg-amber-50 text-amber-800",
  CLEANING: "border-neutral-400 bg-neutral-100 text-neutral-600",
};

const STATUS_LABELS: Record<TableStatus, string> = {
  FREE: "Libre",
  OCCUPIED: "Occupée",
  RESERVED: "Réservée",
  CLEANING: "Nettoyage",
};

export default function TablesPage() {
  const { data: session } = useSession();
  const { authFetch } = useNestApi();

  const [tables, setTables] = useState<Table[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", capacity: "4", zone: "" });

  const canManage =
    session?.user.permissions.includes("tables:manage") ?? false;

  const load = useCallback(async () => {
    const res = await authFetch("/tables");
    if (!res.ok) return;
    const data = (await res.json()) as { tables: Table[] };
    setTables(data.tables);
  }, [authFetch]);

  useEffect(() => {
    load();
  }, [load]);

  // Diffusion en direct (nouvelle commande sur des tables, encaissement,
  // changement de statut) — voir orders/payments/tables .service.ts côté API.
  useRealtimeSocket("table:updated", load);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    await authFetch("/tables", {
      method: "POST",
      body: JSON.stringify({
        name: form.name,
        capacity: Number(form.capacity),
        zone: form.zone || undefined,
      }),
    });
    setForm({ name: "", capacity: "4", zone: "" });
    setShowForm(false);
    load();
  }

  async function handleStatusChange(id: string, status: TableStatus) {
    await authFetch(`/tables/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    load();
  }

  async function handleDelete(id: string) {
    await authFetch(`/tables/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <main className="flex min-h-screen flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Plan de salle</h1>
        <Link href="/" className="text-sm text-neutral-500 hover:underline">
          ← Tableau de bord
        </Link>
      </div>

      <div className="flex items-center gap-4 text-xs">
        {(Object.keys(STATUS_LABELS) as TableStatus[]).map((s) => (
          <span
            key={s}
            className={`rounded border px-2 py-1 ${STATUS_STYLES[s]}`}
          >
            {STATUS_LABELS[s]}
          </span>
        ))}
        {canManage && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="ml-auto rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white"
          >
            Nouvelle table
          </button>
        )}
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="flex flex-wrap items-end gap-3 rounded border border-neutral-300 p-4"
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium">Nom</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium">Capacité</label>
            <input
              type="number"
              min="1"
              value={form.capacity}
              onChange={(e) =>
                setForm((f) => ({ ...f, capacity: e.target.value }))
              }
              className="w-20 rounded border border-neutral-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium">Zone</label>
            <input
              value={form.zone}
              onChange={(e) => setForm((f) => ({ ...f, zone: e.target.value }))}
              placeholder="Terrasse, VIP..."
              className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white"
          >
            Créer
          </button>
        </form>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {tables.map((t) => (
          <div
            key={t.id}
            className={`flex flex-col gap-2 rounded-lg border-2 p-4 ${STATUS_STYLES[t.status]}`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold">{t.name}</span>
              {canManage && (
                <button
                  onClick={() => handleDelete(t.id)}
                  className="text-xs opacity-70 hover:opacity-100"
                >
                  ✕
                </button>
              )}
            </div>
            <span className="text-xs">
              {t.capacity} places{t.zone ? ` · ${t.zone}` : ""}
            </span>
            {canManage ? (
              <select
                value={t.status}
                onChange={(e) =>
                  handleStatusChange(t.id, e.target.value as TableStatus)
                }
                className="rounded border border-current bg-white/60 px-2 py-1 text-xs"
              >
                {(Object.keys(STATUS_LABELS) as TableStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-xs font-medium">
                {STATUS_LABELS[t.status]}
              </span>
            )}
          </div>
        ))}
        {tables.length === 0 && (
          <p className="col-span-full text-sm text-neutral-500">
            Aucune table.
          </p>
        )}
      </div>
    </main>
  );
}
