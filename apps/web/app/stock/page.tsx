"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useNestApi } from "@/hooks/useNestApi";

const MOVEMENT_TYPES = [
  "PURCHASE_IN",
  "SALE_OUT",
  "RECIPE_CONSUMPTION",
  "ADJUSTMENT_IN",
  "ADJUSTMENT_OUT",
  "INVENTORY_CORRECTION",
  "TRANSFER_IN",
  "TRANSFER_OUT",
] as const;

interface Movement {
  id: string;
  createdAt: string;
  type: string;
  quantity: string;
  quantityBefore: string;
  quantityAfter: string;
  reason: string | null;
  referenceLabel: string | null;
  product: { id: string; name: string };
  employee: { firstName: string; lastName: string } | null;
}

interface Product {
  id: string;
  name: string;
}

const PAGE_SIZE = 20;

export default function StockPage() {
  const { data: session } = useSession();
  const { authFetch } = useNestApi();

  const [movements, setMovements] = useState<Movement[]>([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [productId, setProductId] = useState("");
  const [type, setType] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [showAdjustForm, setShowAdjustForm] = useState(false);
  const [adjustForm, setAdjustForm] = useState({
    productId: "",
    type: "ADJUSTMENT_IN",
    quantity: "",
    reason: "",
  });
  const [adjustError, setAdjustError] = useState<string | null>(null);

  const canAdjust =
    session?.user.permissions.includes("inventory:adjust") ?? false;

  const loadMovements = useCallback(async () => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
    });
    if (productId) params.set("productId", productId);
    if (type) params.set("type", type);
    const res = await authFetch(`/stock/movements?${params.toString()}`);
    if (!res.ok) return;
    const data = (await res.json()) as {
      movements: Movement[];
      meta: typeof meta;
    };
    setMovements(data.movements);
    setMeta(data.meta);
  }, [authFetch, page, productId, type]);

  useEffect(() => {
    authFetch("/products?pageSize=200")
      .then((res) => res.json())
      .then((data: { products: Product[] }) => setProducts(data.products))
      .catch(() => setProducts([]));
  }, [authFetch]);

  useEffect(() => {
    loadMovements();
  }, [loadMovements]);

  async function handleExport() {
    const params = new URLSearchParams();
    if (productId) params.set("productId", productId);
    if (type) params.set("type", type);
    const res = await authFetch(`/stock/movements/export?${params.toString()}`);
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mouvements-stock.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleAdjustSubmit(event: React.FormEvent) {
    event.preventDefault();
    setAdjustError(null);
    const res = await authFetch("/stock/adjustments", {
      method: "POST",
      body: JSON.stringify({
        productId: adjustForm.productId,
        type: adjustForm.type,
        quantity: Number(adjustForm.quantity),
        reason: adjustForm.reason,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setAdjustError(
        Array.isArray(body?.message)
          ? body.message.join(", ")
          : (body?.message ?? "Échec de l'ajustement"),
      );
      return;
    }
    setAdjustForm({
      productId: "",
      type: "ADJUSTMENT_IN",
      quantity: "",
      reason: "",
    });
    setShowAdjustForm(false);
    loadMovements();
  }

  return (
    <main className="flex min-h-screen flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Stock — mouvements</h1>
        <Link href="/" className="text-sm text-neutral-500 hover:underline">
          ← Tableau de bord
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={productId}
          onChange={(e) => {
            setProductId(e.target.value);
            setPage(1);
          }}
          className="rounded border border-neutral-300 px-3 py-1.5 text-sm"
        >
          <option value="">Tous les produits</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setPage(1);
          }}
          className="rounded border border-neutral-300 px-3 py-1.5 text-sm"
        >
          <option value="">Tous les types</option>
          {MOVEMENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <div className="ml-auto flex gap-2">
          <button
            onClick={handleExport}
            className="rounded border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100"
          >
            Exporter CSV
          </button>
          {canAdjust && (
            <button
              onClick={() => setShowAdjustForm((v) => !v)}
              className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white"
            >
              Ajustement manuel
            </button>
          )}
        </div>
      </div>

      {showAdjustForm && (
        <form
          onSubmit={handleAdjustSubmit}
          className="flex flex-wrap items-end gap-3 rounded border border-neutral-300 p-4"
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium">Produit</label>
            <select
              required
              value={adjustForm.productId}
              onChange={(e) =>
                setAdjustForm((f) => ({ ...f, productId: e.target.value }))
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
            <label className="text-xs font-medium">Sens</label>
            <select
              value={adjustForm.type}
              onChange={(e) =>
                setAdjustForm((f) => ({ ...f, type: e.target.value }))
              }
              className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
            >
              <option value="ADJUSTMENT_IN">Entrée</option>
              <option value="ADJUSTMENT_OUT">Sortie</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium">Quantité</label>
            <input
              type="number"
              step="0.001"
              min="0"
              required
              value={adjustForm.quantity}
              onChange={(e) =>
                setAdjustForm((f) => ({ ...f, quantity: e.target.value }))
              }
              className="w-28 rounded border border-neutral-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium">Motif</label>
            <input
              required
              value={adjustForm.reason}
              onChange={(e) =>
                setAdjustForm((f) => ({ ...f, reason: e.target.value }))
              }
              className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white"
          >
            Enregistrer
          </button>
          {adjustError && (
            <p className="w-full text-xs text-red-600">{adjustError}</p>
          )}
        </form>
      )}

      <div className="overflow-x-auto rounded border border-neutral-200">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Produit</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Quantité</th>
              <th className="px-3 py-2">Avant → Après</th>
              <th className="px-3 py-2">Motif / Référence</th>
              <th className="px-3 py-2">Employé</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {movements.map((m) => (
              <tr key={m.id}>
                <td className="px-3 py-2">
                  {new Date(m.createdAt).toLocaleString("fr-FR")}
                </td>
                <td className="px-3 py-2">{m.product.name}</td>
                <td className="px-3 py-2">{m.type}</td>
                <td className="px-3 py-2">{m.quantity}</td>
                <td className="px-3 py-2">
                  {m.quantityBefore} → {m.quantityAfter}
                </td>
                <td className="px-3 py-2 text-neutral-500">
                  {m.reason ?? m.referenceLabel ?? "—"}
                </td>
                <td className="px-3 py-2">
                  {m.employee
                    ? `${m.employee.firstName} ${m.employee.lastName}`
                    : "—"}
                </td>
              </tr>
            ))}
            {movements.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-6 text-center text-neutral-500"
                >
                  Aucun mouvement.
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
            Page {meta.page} / {meta.totalPages} ({meta.total} mouvements)
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
    </main>
  );
}
