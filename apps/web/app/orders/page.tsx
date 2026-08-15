"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useNestApi } from "@/hooks/useNestApi";
import { useRealtimeSocket } from "@/hooks/useRealtimeSocket";

type PaidStatus = "UNPAID" | "PAID" | "CANCELLED";

interface OrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  orderType: string;
  totalAmount: string;
  createdAt: string;
  orderTables: { table: { name: string } }[];
}

const PAID_STATUS_LABELS: Record<PaidStatus, string> = {
  UNPAID: "Pas soldée",
  PAID: "Encaissée",
  CANCELLED: "Annulée",
};

export default function OrdersPage() {
  const { data: session } = useSession();
  const { authFetch } = useNestApi();

  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [paidStatus, setPaidStatus] = useState<PaidStatus | "">("");

  const canCreate =
    session?.user.permissions.includes("orders:create") ?? false;

  const load = useCallback(async () => {
    const params = new URLSearchParams({ pageSize: "50" });
    if (paidStatus) params.set("paidStatus", paidStatus);
    const res = await authFetch(`/orders?${params.toString()}`);
    if (!res.ok) return;
    const data = (await res.json()) as { orders: OrderSummary[] };
    setOrders(data.orders);
  }, [authFetch, paidStatus]);

  useEffect(() => {
    load();
  }, [load]);

  useRealtimeSocket("order:created", load);

  return (
    <main className="flex min-h-screen flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Commandes</h1>
        <Link href="/" className="text-sm text-neutral-500 hover:underline">
          ← Tableau de bord
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <select
          value={paidStatus}
          onChange={(e) => setPaidStatus(e.target.value as PaidStatus | "")}
          className="rounded border border-neutral-300 px-3 py-1.5 text-sm"
        >
          <option value="">Toutes</option>
          {(Object.keys(PAID_STATUS_LABELS) as PaidStatus[]).map((s) => (
            <option key={s} value={s}>
              {PAID_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        {canCreate && (
          <Link
            href="/orders/new"
            className="ml-auto rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white"
          >
            Nouvelle commande
          </Link>
        )}
      </div>

      <div className="overflow-x-auto rounded border border-neutral-200">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-3 py-2">N°</th>
              <th className="px-3 py-2">Tables</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Statut</th>
              <th className="px-3 py-2">Total</th>
              <th className="px-3 py-2">Créée</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {orders.map((o) => (
              <tr key={o.id}>
                <td className="px-3 py-2">
                  <Link
                    href={`/orders/${o.id}`}
                    className="font-medium hover:underline"
                  >
                    {o.orderNumber}
                  </Link>
                </td>
                <td className="px-3 py-2">
                  {o.orderTables.map((t) => t.table.name).join(", ") || "—"}
                </td>
                <td className="px-3 py-2">{o.orderType}</td>
                <td className="px-3 py-2">{o.status}</td>
                <td className="px-3 py-2">{o.totalAmount}</td>
                <td className="px-3 py-2">
                  {new Date(o.createdAt).toLocaleString("fr-FR")}
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-6 text-center text-neutral-500"
                >
                  Aucune commande.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
