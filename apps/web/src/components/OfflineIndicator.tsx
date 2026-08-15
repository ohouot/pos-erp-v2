"use client";

import { useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { useSession } from "next-auth/react";
import { offlineDb } from "@/lib/offlineDb";
import { useConnectivityStore } from "@/stores/connectivity.store";
import { syncOfflineOrders } from "@/lib/offlineSync";

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  syncing: "Synchronisation...",
  failed: "Échec",
  synced: "Synchronisée",
};

export function OfflineIndicator() {
  const { data: session } = useSession();
  const isOnline = useConnectivityStore((s) => s.isOnline);
  const [isOpen, setIsOpen] = useState(false);
  const orders =
    useLiveQuery(
      () => offlineDb.orders.orderBy("createdAt").reverse().toArray(),
      [],
    ) ?? [];

  const pendingCount = orders.filter(
    (o) => o.status === "pending" || o.status === "failed",
  ).length;

  // Rien à signaler : en ligne et aucune commande en attente locale — pas
  // la peine d'encombrer l'en-tête (même logique que le projet de référence).
  if (isOnline && orders.length === 0) {
    return (
      <span title="Connecté" className="text-neutral-400">
        📶
      </span>
    );
  }

  async function handleDiscard(localId: string) {
    await offlineDb.orders.delete(localId);
  }

  async function handleSyncNow() {
    if (session?.accessToken) await syncOfflineOrders(session.accessToken);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen((v) => !v)}
        className={`relative rounded border px-2 py-1 text-sm ${
          isOnline ? "border-neutral-300" : "border-red-400 text-red-700"
        }`}
      >
        {isOnline ? "📶" : "📵"} {!isOnline && "Hors ligne"}
        {pendingCount > 0 && (
          <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs text-white">
            {pendingCount > 9 ? "9+" : pendingCount}
          </span>
        )}
      </button>
      {isOpen && (
        <div className="absolute right-0 z-10 mt-1 w-72 rounded border border-neutral-300 bg-white p-2 shadow-lg">
          <p className="mb-2 text-xs font-medium text-neutral-500">
            Commandes hors ligne
          </p>
          {orders.length === 0 && (
            <p className="text-xs text-neutral-400">
              Aucune commande en attente.
            </p>
          )}
          <ul className="flex flex-col gap-2">
            {orders.map((o) => (
              <li
                key={o.localId}
                className="rounded border border-neutral-200 p-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <Link
                    href={`/orders/offline/${o.localId}`}
                    className="font-medium hover:underline"
                  >
                    {o.tableNames.join(", ") || o.orderType}
                  </Link>
                  <span>{STATUS_LABELS[o.status]}</span>
                </div>
                {o.error && <p className="text-red-600">{o.error}</p>}
                {o.status === "failed" && (
                  <button
                    onClick={() => handleDiscard(o.localId)}
                    className="mt-1 text-red-600 hover:underline"
                  >
                    Abandonner
                  </button>
                )}
              </li>
            ))}
          </ul>
          {isOnline && pendingCount > 0 && (
            <button
              onClick={handleSyncNow}
              className="mt-2 w-full rounded bg-neutral-900 px-2 py-1 text-xs font-medium text-white"
            >
              Synchroniser
            </button>
          )}
        </div>
      )}
    </div>
  );
}
