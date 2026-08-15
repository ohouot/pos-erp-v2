"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useNestApi } from "@/hooks/useNestApi";

interface Supplier {
  id: string;
  name: string;
}
interface Product {
  id: string;
  name: string;
  baseUnitId: string;
}
interface UnitOption {
  id: string;
  name: string;
  symbol: string;
}

interface PurchaseItem {
  quantity: string;
  purchasePrice: string;
  productId: string;
  unitId: string;
  unit: { symbol: string };
  product: { name: string };
}

interface Purchase {
  id: string;
  invoiceNumber: string | null;
  purchaseDate: string;
  status: "DRAFT" | "VALIDATED" | "CANCELLED";
  totalAmount: string;
  supplier: { name: string };
  items: PurchaseItem[];
}

interface DraftLine {
  productId: string;
  unitId: string;
  quantity: string;
  purchasePrice: string;
}

export default function PurchasesPage() {
  const { data: session } = useSession();
  const { authFetch } = useNestApi();

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([
    { productId: "", unitId: "", quantity: "", purchasePrice: "" },
  ]);
  const [formError, setFormError] = useState<string | null>(null);

  const canCreate =
    session?.user.permissions.includes("purchases:create") ?? false;
  const canValidate =
    session?.user.permissions.includes("purchases:validate") ?? false;
  const canCancel =
    session?.user.permissions.includes("purchases:cancel") ?? false;

  const loadPurchases = useCallback(async () => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    const res = await authFetch(`/purchases?${params.toString()}`);
    if (!res.ok) return;
    const data = (await res.json()) as { purchases: Purchase[] };
    setPurchases(data.purchases);
  }, [authFetch, statusFilter]);

  useEffect(() => {
    Promise.all([
      authFetch("/suppliers").then((r) => r.json()),
      authFetch("/products?pageSize=200").then((r) => r.json()),
      authFetch("/units").then((r) => r.json()),
    ]).then(([s, p, u]) => {
      setSuppliers(s.suppliers);
      setProducts(p.products);
      setUnits(u.units);
    });
  }, [authFetch]);

  useEffect(() => {
    loadPurchases();
  }, [loadPurchases]);

  function updateLine(index: number, patch: Partial<DraftLine>) {
    setLines((prev) =>
      prev.map((l, i) => (i === index ? { ...l, ...patch } : l)),
    );
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    const res = await authFetch("/purchases", {
      method: "POST",
      body: JSON.stringify({
        supplierId,
        invoiceNumber: invoiceNumber || undefined,
        items: lines
          .filter(
            (l) => l.productId && l.unitId && l.quantity && l.purchasePrice,
          )
          .map((l) => ({
            productId: l.productId,
            unitId: l.unitId,
            quantity: Number(l.quantity),
            purchasePrice: Number(l.purchasePrice),
          })),
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setFormError(
        Array.isArray(body?.message)
          ? body.message.join(", ")
          : (body?.message ?? "Échec de la création"),
      );
      return;
    }
    setSupplierId("");
    setInvoiceNumber("");
    setLines([{ productId: "", unitId: "", quantity: "", purchasePrice: "" }]);
    setShowForm(false);
    loadPurchases();
  }

  async function handleValidate(id: string) {
    await authFetch(`/purchases/${id}/validate`, { method: "POST" });
    loadPurchases();
  }

  async function handleCancel(id: string) {
    await authFetch(`/purchases/${id}/cancel`, { method: "POST" });
    loadPurchases();
  }

  return (
    <main className="flex min-h-screen flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Achats fournisseurs</h1>
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
          <option value="DRAFT">Brouillon</option>
          <option value="VALIDATED">Validé</option>
          <option value="CANCELLED">Annulé</option>
        </select>
        {canCreate && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="ml-auto rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white"
          >
            Nouveau bon d&apos;achat
          </button>
        )}
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="flex flex-col gap-4 rounded border border-neutral-300 p-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Fournisseur</label>
              <select
                required
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
              >
                <option value="">—</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">N° facture</label>
              <input
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium">Articles</label>
            {lines.map((line, i) => (
              <div key={i} className="flex items-end gap-2">
                <select
                  value={line.productId}
                  onChange={(e) => updateLine(i, { productId: e.target.value })}
                  className="flex-1 rounded border border-neutral-300 px-2 py-1.5 text-sm"
                >
                  <option value="">Produit</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <select
                  value={line.unitId}
                  onChange={(e) => updateLine(i, { unitId: e.target.value })}
                  className="w-32 rounded border border-neutral-300 px-2 py-1.5 text-sm"
                >
                  <option value="">Unité</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.001"
                  placeholder="Qté"
                  value={line.quantity}
                  onChange={(e) => updateLine(i, { quantity: e.target.value })}
                  className="w-24 rounded border border-neutral-300 px-2 py-1.5 text-sm"
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Prix unitaire"
                  value={line.purchasePrice}
                  onChange={(e) =>
                    updateLine(i, { purchasePrice: e.target.value })
                  }
                  className="w-28 rounded border border-neutral-300 px-2 py-1.5 text-sm"
                />
                <button
                  type="button"
                  onClick={() =>
                    setLines((prev) => prev.filter((_, idx) => idx !== i))
                  }
                  className="text-xs text-red-600 hover:underline"
                >
                  Retirer
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setLines((prev) => [
                  ...prev,
                  {
                    productId: "",
                    unitId: "",
                    quantity: "",
                    purchasePrice: "",
                  },
                ])
              }
              className="w-fit rounded border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100"
            >
              Ajouter une ligne
            </button>
          </div>

          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <button
            type="submit"
            className="w-fit rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
          >
            Créer le brouillon
          </button>
        </form>
      )}

      <div className="overflow-x-auto rounded border border-neutral-200">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Fournisseur</th>
              <th className="px-3 py-2">Facture</th>
              <th className="px-3 py-2">Statut</th>
              <th className="px-3 py-2">Total</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {purchases.map((p) => (
              <tr key={p.id}>
                <td className="px-3 py-2">
                  {new Date(p.purchaseDate).toLocaleDateString("fr-FR")}
                </td>
                <td className="px-3 py-2">{p.supplier.name}</td>
                <td className="px-3 py-2">{p.invoiceNumber ?? "—"}</td>
                <td className="px-3 py-2">
                  <span
                    className={
                      p.status === "VALIDATED"
                        ? "rounded bg-green-100 px-2 py-0.5 text-green-800"
                        : p.status === "CANCELLED"
                          ? "rounded bg-neutral-100 px-2 py-0.5 text-neutral-500"
                          : "rounded bg-amber-100 px-2 py-0.5 text-amber-800"
                    }
                  >
                    {p.status}
                  </span>
                </td>
                <td className="px-3 py-2">{p.totalAmount}</td>
                <td className="px-3 py-2 text-right">
                  {p.status === "DRAFT" && (
                    <div className="flex justify-end gap-2">
                      {canValidate && (
                        <button
                          onClick={() => handleValidate(p.id)}
                          className="text-xs text-green-700 hover:underline"
                        >
                          Valider (réception)
                        </button>
                      )}
                      {canCancel && (
                        <button
                          onClick={() => handleCancel(p.id)}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Annuler
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {purchases.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-6 text-center text-neutral-500"
                >
                  Aucun bon d&apos;achat.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
