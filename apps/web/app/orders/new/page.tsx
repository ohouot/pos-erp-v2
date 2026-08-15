"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useNestApi } from "@/hooks/useNestApi";
import { useConnectivityStore } from "@/stores/connectivity.store";
import { offlineDb } from "@/lib/offlineDb";

const ORDER_TYPES = ["DINE_IN", "TAKEAWAY", "DELIVERY"] as const;

interface Table {
  id: string;
  name: string;
  status: string;
}

export default function OrderNewPage() {
  const { data: session } = useSession();
  const { authFetch } = useNestApi();
  const router = useRouter();
  const isOnline = useConnectivityStore((s) => s.isOnline);

  const [orderType, setOrderType] =
    useState<(typeof ORDER_TYPES)[number]>("DINE_IN");
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTableIds, setSelectedTableIds] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    authFetch("/tables")
      .then((res) => res.json())
      .then((data: { tables: Table[] }) =>
        setTables(data.tables.filter((t) => t.status === "FREE")),
      )
      .catch(() => setTables([]));
  }, [authFetch]);

  function toggleTable(id: string) {
    setSelectedTableIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);

    if (!isOnline) {
      const localId = crypto.randomUUID();
      await offlineDb.orders.add({
        localId,
        orderType,
        tableIds: selectedTableIds,
        tableNames: tables
          .filter((t) => selectedTableIds.includes(t.id))
          .map((t) => t.name),
        notes: notes || undefined,
        items: [],
        createdAt: Date.now(),
        status: "pending",
      });
      setIsSubmitting(false);
      router.push(`/orders/offline/${localId}`);
      return;
    }

    const res = await authFetch("/orders", {
      method: "POST",
      body: JSON.stringify({
        orderType,
        tableIds: selectedTableIds,
        notes: notes || undefined,
      }),
    });
    setIsSubmitting(false);
    if (!res.ok) return;
    const data = (await res.json()) as { order: { id: string } };
    router.push(`/orders/${data.order.id}`);
  }

  return (
    <main className="flex min-h-screen flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Nouvelle commande</h1>
        <Link
          href="/orders"
          className="text-sm text-neutral-500 hover:underline"
        >
          ← Commandes
        </Link>
      </div>

      {!isOnline && (
        <div className="rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Hors ligne : la commande sera enregistrée localement et synchronisée
          automatiquement au retour de la connexion.
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex max-w-lg flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Type de commande</label>
          <select
            value={orderType}
            onChange={(e) =>
              setOrderType(e.target.value as (typeof ORDER_TYPES)[number])
            }
            className="rounded border border-neutral-300 px-3 py-2"
          >
            {ORDER_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {orderType === "DINE_IN" && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">
              Tables (sélectionnez-en plusieurs pour fusionner)
            </label>
            <div className="flex flex-wrap gap-2">
              {tables.map((t) => (
                <label
                  key={t.id}
                  className={`cursor-pointer rounded border px-3 py-1.5 text-sm ${
                    selectedTableIds.includes(t.id)
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={selectedTableIds.includes(t.id)}
                    onChange={() => toggleTable(t.id)}
                  />
                  {t.name}
                </label>
              ))}
              {tables.length === 0 && (
                <p className="text-xs text-neutral-500">Aucune table libre.</p>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="rounded border border-neutral-300 px-3 py-2"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !session}
          className="w-fit rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {isSubmitting
            ? "Création..."
            : isOnline
              ? "Créer la commande"
              : "Enregistrer hors ligne"}
        </button>
      </form>
    </main>
  );
}
