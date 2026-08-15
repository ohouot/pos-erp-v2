"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useNestApi } from "@/hooks/useNestApi";

const WARNING_MINUTES = 5;
const URGENT_MINUTES = 10;
const POLL_INTERVAL_MS = 8000;

interface KitchenOrder {
  id: string;
  orderNumber: string;
  orderType: string;
  notes: string | null;
  createdAt: string;
  orderTables: { table: { name: string } }[];
  items: {
    id: string;
    productName: string | null;
    quantity: string;
    status: string;
  }[];
}

function elapsedMinutes(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
}

function badgeClass(minutes: number): string {
  if (minutes >= URGENT_MINUTES) return "bg-red-100 text-red-800";
  if (minutes >= WARNING_MINUTES) return "bg-amber-100 text-amber-800";
  return "bg-green-100 text-green-800";
}

export default function KitchenPage() {
  const { authFetch } = useNestApi();
  const [orders, setOrders] = useState<KitchenOrder[]>([]);

  const load = useCallback(async () => {
    const res = await authFetch("/orders?status=SENT_TO_KITCHEN&pageSize=50");
    if (!res.ok) return;
    const data = (await res.json()) as { orders: KitchenOrder[] };
    setOrders(data.orders);
  }, [authFetch]);

  useEffect(() => {
    load();
    // Personne n'est devant l'écran pour cliquer "rafraîchir" en cuisine —
    // sondage, pas de temps réel (même comportement que le projet de
    // référence : sendToKitchen/markServed n'émettent aucun événement socket).
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  async function handleMarkServed(id: string) {
    await authFetch(`/orders/${id}/mark-served`, { method: "POST" });
    load();
  }

  return (
    <main className="flex min-h-screen flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Cuisine</h1>
        <Link href="/" className="text-sm text-neutral-500 hover:underline">
          ← Tableau de bord
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {orders.map((order) => {
          const minutes = elapsedMinutes(order.createdAt);
          const activeItems = order.items.filter(
            (i) => i.status !== "CANCELLED",
          );
          return (
            <div
              key={order.id}
              className="flex flex-col gap-3 rounded-lg border border-neutral-300 p-4"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">{order.orderNumber}</span>
                <span
                  className={`rounded px-2 py-0.5 text-xs font-medium ${badgeClass(minutes)}`}
                >
                  {minutes} min
                </span>
              </div>
              <p className="text-xs text-neutral-500">
                {order.orderTables.map((t) => t.table.name).join(", ") ||
                  order.orderType}
              </p>
              <ul className="flex flex-col gap-1 text-sm">
                {activeItems.map((item) => (
                  <li key={item.id}>
                    {item.quantity}× {item.productName}
                  </li>
                ))}
              </ul>
              {order.notes && (
                <p className="text-xs italic text-neutral-500">{order.notes}</p>
              )}
              <button
                onClick={() => handleMarkServed(order.id)}
                className="mt-auto w-full rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white"
              >
                Prêt / Servi
              </button>
            </div>
          );
        })}
        {orders.length === 0 && (
          <p className="col-span-full text-center text-sm text-neutral-500">
            Aucune commande en cuisine.
          </p>
        )}
      </div>
    </main>
  );
}
