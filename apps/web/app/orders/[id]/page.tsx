"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useNestApi } from "@/hooks/useNestApi";

interface Product {
  id: string;
  name: string;
  salePrice: string;
  salePrice2: string | null;
  salePrice3: string | null;
}

interface OrderItem {
  id: string;
  productId: string;
  productName: string | null;
  quantity: string;
  unitPrice: string;
  totalPrice: string;
  status: string;
}

interface OrderDetail {
  id: string;
  orderNumber: string;
  status: "OPEN" | "SENT_TO_KITCHEN" | "SERVED" | "PAID" | "CANCELLED";
  orderType: string;
  subtotal: string;
  taxAmount: string;
  discountAmount: string;
  totalAmount: string;
  notes: string | null;
  items: OrderItem[];
  orderTables: { table: { name: string } }[];
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const { authFetch } = useNestApi();
  const router = useRouter();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [itemForm, setItemForm] = useState({
    productId: "",
    quantity: "1",
    priceTier: "1",
    discountAmount: "0",
  });
  const [error, setError] = useState<string | null>(null);

  const canCreate =
    session?.user.permissions.includes("orders:create") ?? false;
  const canUpdate =
    session?.user.permissions.includes("orders:update") ?? false;
  const canCancel =
    session?.user.permissions.includes("orders:cancel") ?? false;

  const load = useCallback(async () => {
    const res = await authFetch(`/orders/${id}`);
    if (!res.ok) return;
    const data = (await res.json()) as { order: OrderDetail };
    setOrder(data.order);
  }, [authFetch, id]);

  useEffect(() => {
    load();
    authFetch("/products?pageSize=100")
      .then((res) => res.json())
      .then((data: { products: Product[] }) => setProducts(data.products))
      .catch(() => setProducts([]));
  }, [authFetch, load]);

  const selectedProduct = products.find((p) => p.id === itemForm.productId);
  const hasTiers =
    selectedProduct &&
    (selectedProduct.salePrice2 || selectedProduct.salePrice3);

  async function handleAddItem(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const res = await authFetch(`/orders/${id}/items`, {
      method: "POST",
      body: JSON.stringify({
        productId: itemForm.productId,
        quantity: Number(itemForm.quantity),
        priceTier: Number(itemForm.priceTier),
        discountAmount: Number(itemForm.discountAmount),
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(
        Array.isArray(body?.message)
          ? body.message.join(", ")
          : (body?.message ?? "Échec"),
      );
      return;
    }
    setItemForm({
      productId: "",
      quantity: "1",
      priceTier: "1",
      discountAmount: "0",
    });
    load();
  }

  async function handleRemoveItem(itemId: string) {
    await authFetch(`/orders/${id}/items/${itemId}`, { method: "DELETE" });
    load();
  }

  async function handleSendToKitchen() {
    setError(null);
    const res = await authFetch(`/orders/${id}/send-to-kitchen`, {
      method: "POST",
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.message ?? "Échec de l'envoi en cuisine");
      return;
    }
    load();
  }

  async function handleMarkServed() {
    await authFetch(`/orders/${id}/mark-served`, { method: "POST" });
    load();
  }

  async function handleCancel() {
    const res = await authFetch(`/orders/${id}/cancel`, { method: "POST" });
    if (res.ok) router.push("/orders");
  }

  if (!order) {
    return (
      <main className="p-8">
        <p className="text-sm text-neutral-500">Chargement...</p>
      </main>
    );
  }

  const isOpen = order.status === "OPEN";

  return (
    <main className="flex min-h-screen flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Commande {order.orderNumber}</h1>
        <Link
          href="/orders"
          className="text-sm text-neutral-500 hover:underline"
        >
          ← Commandes
        </Link>
      </div>

      <p className="text-sm">
        Statut : <span className="font-medium">{order.status}</span>
        {order.orderTables.length > 0 && (
          <span className="ml-3 text-neutral-500">
            Tables : {order.orderTables.map((t) => t.table.name).join(", ")}
          </span>
        )}
      </p>

      {isOpen && canCreate && (
        <form
          onSubmit={handleAddItem}
          className="flex flex-wrap items-end gap-3 rounded border border-neutral-300 p-4"
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium">Produit</label>
            <select
              required
              value={itemForm.productId}
              onChange={(e) =>
                setItemForm((f) => ({ ...f, productId: e.target.value }))
              }
              className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
            >
              <option value="">—</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          {hasTiers && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Niveau de prix</label>
              <select
                value={itemForm.priceTier}
                onChange={(e) =>
                  setItemForm((f) => ({ ...f, priceTier: e.target.value }))
                }
                className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
              >
                <option value="1">Prix 1 ({selectedProduct?.salePrice})</option>
                {selectedProduct?.salePrice2 && (
                  <option value="2">
                    Prix 2 ({selectedProduct.salePrice2})
                  </option>
                )}
                {selectedProduct?.salePrice3 && (
                  <option value="3">
                    Prix 3 ({selectedProduct.salePrice3})
                  </option>
                )}
              </select>
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium">Quantité</label>
            <input
              type="number"
              step="0.001"
              min="0.001"
              value={itemForm.quantity}
              onChange={(e) =>
                setItemForm((f) => ({ ...f, quantity: e.target.value }))
              }
              className="w-24 rounded border border-neutral-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium">Remise</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={itemForm.discountAmount}
              onChange={(e) =>
                setItemForm((f) => ({ ...f, discountAmount: e.target.value }))
              }
              className="w-24 rounded border border-neutral-300 px-2 py-1.5 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white"
          >
            Ajouter
          </button>
          {error && <p className="w-full text-xs text-red-600">{error}</p>}
        </form>
      )}

      <div className="overflow-x-auto rounded border border-neutral-200">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-3 py-2">Produit</th>
              <th className="px-3 py-2">Qté</th>
              <th className="px-3 py-2">PU</th>
              <th className="px-3 py-2">Total</th>
              <th className="px-3 py-2">Statut</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {order.items.map((item) => (
              <tr key={item.id}>
                <td className="px-3 py-2">{item.productName}</td>
                <td className="px-3 py-2">{item.quantity}</td>
                <td className="px-3 py-2">{item.unitPrice}</td>
                <td className="px-3 py-2">{item.totalPrice}</td>
                <td className="px-3 py-2">{item.status}</td>
                <td className="px-3 py-2 text-right">
                  {isOpen && canUpdate && (
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Retirer
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {order.items.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-6 text-center text-neutral-500"
                >
                  Aucun article.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex max-w-xs flex-col gap-1 self-end text-sm">
        <div className="flex justify-between">
          <span>Sous-total</span>
          <span>{order.subtotal}</span>
        </div>
        <div className="flex justify-between">
          <span>Remises</span>
          <span>-{order.discountAmount}</span>
        </div>
        <div className="flex justify-between">
          <span>Taxe</span>
          <span>{order.taxAmount}</span>
        </div>
        <div className="flex justify-between font-semibold">
          <span>Total</span>
          <span>{order.totalAmount}</span>
        </div>
      </div>

      <div className="flex gap-3">
        {isOpen && canUpdate && (
          <button
            onClick={handleSendToKitchen}
            disabled={order.items.length === 0}
            className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Envoyer en cuisine
          </button>
        )}
        {order.status === "SENT_TO_KITCHEN" && canUpdate && (
          <button
            onClick={handleMarkServed}
            className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
          >
            Marquer servi
          </button>
        )}
        {isOpen && canCancel && (
          <button
            onClick={handleCancel}
            className="rounded border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-50"
          >
            Annuler la commande
          </button>
        )}
      </div>
    </main>
  );
}
