"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useNestApi } from "@/hooks/useNestApi";

interface Product {
  id: string;
  name: string;
}

interface InventoryItem {
  id: string;
  productId: string;
  theoreticalQuantity: string;
  realQuantity: string;
  difference: string;
  notes: string | null;
  product: { id: string; name: string };
}

interface SessionDetail {
  id: string;
  status: "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  notes: string | null;
  startedAt: string;
  items: InventoryItem[];
}

export default function InventorySessionPage() {
  const { id } = useParams<{ id: string }>();
  const { data: authSession } = useSession();
  const { authFetch } = useNestApi();
  const router = useRouter();

  const [inventorySession, setInventorySession] =
    useState<SessionDetail | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState({
    productId: "",
    realQuantity: "",
    notes: "",
  });
  const [error, setError] = useState<string | null>(null);

  const canAdjust =
    authSession?.user.permissions.includes("inventory:adjust") ?? false;
  const canComplete =
    authSession?.user.permissions.includes("inventory:session:complete") ??
    false;
  const canStart =
    authSession?.user.permissions.includes("inventory:session:start") ?? false;

  const load = useCallback(async () => {
    const res = await authFetch(`/inventory/sessions/${id}`);
    if (!res.ok) return;
    const data = (await res.json()) as { session: SessionDetail };
    setInventorySession(data.session);
  }, [authFetch, id]);

  useEffect(() => {
    load();
    authFetch("/products?pageSize=200")
      .then((res) => res.json())
      .then((data: { products: Product[] }) => setProducts(data.products))
      .catch(() => setProducts([]));
  }, [authFetch, load]);

  async function handleRecord(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const res = await authFetch(`/inventory/sessions/${id}/items`, {
      method: "POST",
      body: JSON.stringify({
        productId: form.productId,
        realQuantity: Number(form.realQuantity),
        notes: form.notes || undefined,
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
    setForm({ productId: "", realQuantity: "", notes: "" });
    load();
  }

  async function handleRemove(productId: string) {
    await authFetch(`/inventory/sessions/${id}/items/${productId}`, {
      method: "DELETE",
    });
    load();
  }

  async function handleComplete() {
    const res = await authFetch(`/inventory/sessions/${id}/complete`, {
      method: "POST",
    });
    if (res.ok) load();
  }

  async function handleCancel() {
    const res = await authFetch(`/inventory/sessions/${id}/cancel`, {
      method: "POST",
    });
    if (res.ok) router.push("/inventory");
  }

  if (!inventorySession) {
    return (
      <main className="p-8">
        <p className="text-sm text-neutral-500">Chargement...</p>
      </main>
    );
  }

  const inProgress = inventorySession.status === "IN_PROGRESS";

  return (
    <main className="flex min-h-screen flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          Inventaire du{" "}
          {new Date(inventorySession.startedAt).toLocaleDateString("fr-FR")}
        </h1>
        <Link
          href="/inventory"
          className="text-sm text-neutral-500 hover:underline"
        >
          ← Sessions
        </Link>
      </div>

      <p className="text-sm">
        Statut : <span className="font-medium">{inventorySession.status}</span>
      </p>

      {inProgress && canAdjust && (
        <form
          onSubmit={handleRecord}
          className="flex flex-wrap items-end gap-3 rounded border border-neutral-300 p-4"
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium">Produit</label>
            <select
              required
              value={form.productId}
              onChange={(e) =>
                setForm((f) => ({ ...f, productId: e.target.value }))
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
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium">Quantité comptée</label>
            <input
              type="number"
              step="0.001"
              min="0"
              required
              value={form.realQuantity}
              onChange={(e) =>
                setForm((f) => ({ ...f, realQuantity: e.target.value }))
              }
              className="w-32 rounded border border-neutral-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium">Note</label>
            <input
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
              className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white"
          >
            Compter
          </button>
          {error && <p className="w-full text-xs text-red-600">{error}</p>}
        </form>
      )}

      <div className="overflow-x-auto rounded border border-neutral-200">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-3 py-2">Produit</th>
              <th className="px-3 py-2">Théorique</th>
              <th className="px-3 py-2">Compté</th>
              <th className="px-3 py-2">Écart</th>
              <th className="px-3 py-2">Note</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {inventorySession.items.map((item) => (
              <tr key={item.id}>
                <td className="px-3 py-2">{item.product.name}</td>
                <td className="px-3 py-2">{item.theoreticalQuantity}</td>
                <td className="px-3 py-2">{item.realQuantity}</td>
                <td
                  className={`px-3 py-2 ${Number(item.difference) !== 0 ? "text-amber-700" : ""}`}
                >
                  {item.difference}
                </td>
                <td className="px-3 py-2 text-neutral-500">
                  {item.notes ?? "—"}
                </td>
                <td className="px-3 py-2 text-right">
                  {inProgress && canAdjust && (
                    <button
                      onClick={() => handleRemove(item.productId)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Retirer
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {inventorySession.items.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-6 text-center text-neutral-500"
                >
                  Aucun produit compté.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {inProgress && (
        <div className="flex gap-3">
          {canComplete && (
            <button
              onClick={handleComplete}
              className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
            >
              Clôturer l&apos;inventaire
            </button>
          )}
          {canStart && (
            <button
              onClick={handleCancel}
              className="rounded border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-50"
            >
              Annuler la session
            </button>
          )}
        </div>
      )}
    </main>
  );
}
