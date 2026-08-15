"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { useSession } from "next-auth/react";
import { offlineDb, type OfflineOrderItem } from "@/lib/offlineDb";
import { useConnectivityStore } from "@/stores/connectivity.store";
import { syncOfflineOrders } from "@/lib/offlineSync";
import { useNestApi } from "@/hooks/useNestApi";

interface Product {
  id: string;
  name: string;
  salePrice: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente de connexion",
  syncing: "Synchronisation en cours...",
  failed: "Échec de la synchronisation",
  synced: "Synchronisée",
};

// Page dédiée, ne réutilise pas OrderDetailPage — évite de faire dépendre
// une seule page de deux sources de données (REST vs IndexedDB) et protège
// le parcours en ligne, déjà éprouvé, d'une régression.
export default function OfflineOrderPage() {
  const { localId } = useParams<{ localId: string }>();
  const { data: session } = useSession();
  const { authFetch } = useNestApi();
  const isOnline = useConnectivityStore((s) => s.isOnline);

  const order = useLiveQuery(() => offlineDb.orders.get(localId), [localId]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");

  useEffect(() => {
    authFetch("/products?pageSize=100")
      .then((res) => res.json())
      .then((data: { products: Product[] }) => setProducts(data.products))
      .catch(() => setProducts([]));
  }, [authFetch]);

  async function handleAddItem(event: React.FormEvent) {
    event.preventDefault();
    if (!order) return;
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    const newItem: OfflineOrderItem = {
      productId: product.id,
      productName: product.name,
      quantity: Number(quantity),
      unitPrice: Number(product.salePrice),
    };
    await offlineDb.orders.update(localId, {
      items: [...order.items, newItem],
    });
    setProductId("");
    setQuantity("1");
  }

  async function handleRemoveItem(index: number) {
    if (!order) return;
    await offlineDb.orders.update(localId, {
      items: order.items.filter((_, i) => i !== index),
    });
  }

  async function handleSyncNow() {
    if (session?.accessToken) await syncOfflineOrders(session.accessToken);
  }

  async function handleDiscard() {
    await offlineDb.orders.delete(localId);
  }

  if (!order) {
    return (
      <main className="p-8">
        <p className="text-sm text-neutral-500">
          Commande hors ligne introuvable.
        </p>
      </main>
    );
  }

  if (order.status === "synced" && order.syncedOrderId) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-sm text-neutral-600">
          Commande synchronisée avec succès.
        </p>
        <Link
          href={`/orders/${order.syncedOrderId}`}
          className="text-neutral-900 underline"
        >
          Ouvrir la commande
        </Link>
      </main>
    );
  }

  const estimatedTotal = order.items.reduce(
    (sum, i) => sum + i.unitPrice * i.quantity,
    0,
  );

  return (
    <main className="flex min-h-screen flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Commande hors ligne</h1>
        <Link
          href="/orders"
          className="text-sm text-neutral-500 hover:underline"
        >
          ← Commandes
        </Link>
      </div>

      <div
        className={`rounded border px-4 py-3 text-sm ${
          order.status === "failed"
            ? "border-red-300 bg-red-50 text-red-900"
            : "border-amber-300 bg-amber-50 text-amber-900"
        }`}
      >
        Statut : {STATUS_LABELS[order.status]}
        {order.error && <p className="mt-1">{order.error}</p>}
      </div>

      <p className="text-sm text-neutral-500">
        Tables : {order.tableNames.join(", ") || "—"} · Type : {order.orderType}
      </p>

      <form
        onSubmit={handleAddItem}
        className="flex flex-wrap items-end gap-3 rounded border border-neutral-300 p-4"
      >
        <select
          required
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
        >
          <option value="">Produit</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <input
          type="number"
          step="0.001"
          min="0.001"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="w-24 rounded border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <button
          type="submit"
          className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white"
        >
          Ajouter
        </button>
      </form>

      <ul className="flex flex-col divide-y divide-neutral-200 rounded border border-neutral-200">
        {order.items.map((item, i) => (
          <li
            key={i}
            className="flex items-center justify-between px-3 py-2 text-sm"
          >
            <span>
              {item.productName} × {item.quantity}
            </span>
            <button
              onClick={() => handleRemoveItem(i)}
              className="text-xs text-red-600 hover:underline"
            >
              Retirer
            </button>
          </li>
        ))}
        {order.items.length === 0 && (
          <li className="px-3 py-4 text-center text-sm text-neutral-500">
            Aucun article.
          </li>
        )}
      </ul>

      <p className="text-sm text-neutral-500">
        Total estimé :{" "}
        <span className="font-medium text-neutral-900">{estimatedTotal}</span>{" "}
        (hors taxes/remises, recalculé par le serveur à la synchronisation)
      </p>

      <div className="flex gap-3">
        {isOnline && (
          <button
            onClick={handleSyncNow}
            className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
          >
            Synchroniser maintenant
          </button>
        )}
        <button
          onClick={handleDiscard}
          className="rounded border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-50"
        >
          Abandonner
        </button>
      </div>
    </main>
  );
}
