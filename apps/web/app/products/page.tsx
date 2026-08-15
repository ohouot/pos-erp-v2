"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useNestApi } from "@/hooks/useNestApi";
import { CategoriesPanel } from "@/components/products/CategoriesPanel";
import { UnitsPanel } from "@/components/products/UnitsPanel";

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  barcode: string | null;
  salePrice: string;
  currentStock: string;
  minStock: string;
  category: { name: string };
  baseUnit: { symbol: string };
  location: { name: string } | null;
  expirationDate: string | null;
  visibleAtPos: boolean;
  manageStock: boolean;
}

interface ImportResult {
  createdCount: number;
  updatedCount: number;
  errors: { row: number; message: string }[];
}

const PAGE_SIZE = 20;

export default function ProductsPage() {
  const { data: session } = useSession();
  const { authFetch } = useNestApi();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [view, setView] = useState<"products" | "categories" | "units">(
    "products",
  );
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const canCreate =
    session?.user.permissions.includes("products:create") ?? false;
  const canDelete =
    session?.user.permissions.includes("products:delete") ?? false;

  const loadProducts = useCallback(async () => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
    });
    if (search) params.set("search", search);
    if (categoryId) params.set("categoryId", categoryId);
    const res = await authFetch(`/products?${params.toString()}`);
    if (!res.ok) return;
    const data = (await res.json()) as {
      products: Product[];
      meta: typeof meta;
    };
    setProducts(data.products);
    setMeta(data.meta);
  }, [authFetch, page, search, categoryId]);

  useEffect(() => {
    authFetch("/categories")
      .then((res) => res.json())
      .then((data: { categories: Category[] }) =>
        setCategories(data.categories),
      )
      .catch(() => setCategories([]));
  }, [authFetch]);

  useEffect(() => {
    if (view === "products") loadProducts();
  }, [view, loadProducts]);

  async function handleDelete(id: string) {
    await authFetch(`/products/${id}`, { method: "DELETE" });
    loadProducts();
  }

  async function handleImportChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setIsImporting(true);
    setImportResult(null);
    const formData = new FormData();
    formData.append("file", file);
    const res = await authFetch("/products/import", {
      method: "POST",
      body: formData,
    });
    setIsImporting(false);
    if (res.ok) {
      const result = (await res.json()) as ImportResult;
      setImportResult(result);
      loadProducts();
    }
  }

  async function handleExport() {
    const res = await authFetch("/products/export");
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "produits.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadCsvTemplate() {
    const headers = [
      "Désignation",
      "Prix de vente 1",
      "Prix de vente 2",
      "Prix de vente 3",
      "Prix achat",
      "Marge",
      "Quantité",
      "Unité de mesure",
      "Famille",
      "Code barre",
      "Fournisseur",
      "Date d'expiration",
      "Emplacement",
      "Seuil",
      "Photo",
      "Description",
    ];
    const example = [
      "Coca-Cola 33cl",
      "600",
      "",
      "",
      "300",
      "",
      "25",
      "Canette",
      "Boissons",
      "",
      "",
      "",
      "",
      "5",
      "",
      "",
    ];
    const csv = "﻿" + [headers.join(";"), example.join(";")].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modele-produits.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const canManageCatalogue =
    session?.user.permissions.includes("categories:create") ?? false;

  return (
    <main className="flex min-h-screen flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Catalogue</h1>
        <Link href="/" className="text-sm text-neutral-500 hover:underline">
          ← Tableau de bord
        </Link>
      </div>

      <div className="flex gap-2 border-b border-neutral-200">
        {(["products", "categories", "units"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setView(tab)}
            className={`px-4 py-2 text-sm font-medium ${
              view === tab
                ? "border-b-2 border-neutral-900 text-neutral-900"
                : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            {tab === "products"
              ? "Produits"
              : tab === "categories"
                ? "Catégories"
                : "Unités"}
          </button>
        ))}
      </div>

      {view === "categories" && (
        <CategoriesPanel canManage={canManageCatalogue} />
      )}
      {view === "units" && <UnitsPanel canManage={canManageCatalogue} />}

      {view === "products" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <input
              placeholder="Rechercher (nom ou code-barres)..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-64 rounded border border-neutral-300 px-3 py-1.5 text-sm"
            />
            <select
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setPage(1);
              }}
              className="rounded border border-neutral-300 px-3 py-1.5 text-sm"
            >
              <option value="">Toutes les catégories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={downloadCsvTemplate}
                className="rounded border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100"
              >
                Modèle CSV
              </button>
              <button
                onClick={handleExport}
                className="rounded border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100"
              >
                Exporter CSV
              </button>
              {canCreate && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleImportChange}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isImporting}
                    className="rounded border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100 disabled:opacity-50"
                  >
                    {isImporting ? "Import..." : "Importer CSV"}
                  </button>
                  <Link
                    href="/products/new"
                    className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white"
                  >
                    Nouveau produit
                  </Link>
                </>
              )}
            </div>
          </div>

          {importResult && (
            <div className="rounded border border-neutral-300 bg-neutral-50 p-3 text-sm">
              <p>
                {importResult.createdCount} produit(s) créé(s),{" "}
                {importResult.updatedCount} mis à jour.
              </p>
              {importResult.errors.length > 0 && (
                <ul className="mt-2 list-disc pl-5 text-red-600">
                  {importResult.errors.map((e, i) => (
                    <li key={i}>
                      Ligne {e.row} : {e.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="overflow-x-auto rounded border border-neutral-200">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500">
                <tr>
                  <th className="px-3 py-2">Nom</th>
                  <th className="px-3 py-2">Catégorie</th>
                  <th className="px-3 py-2">Unité</th>
                  <th className="px-3 py-2">Prix vente</th>
                  <th className="px-3 py-2">Stock</th>
                  <th className="px-3 py-2">Emplacement</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {products.map((p) => {
                  const lowStock =
                    p.manageStock &&
                    Number(p.currentStock) <= Number(p.minStock);
                  return (
                    <tr key={p.id}>
                      <td className="px-3 py-2">
                        <Link
                          href={`/products/${p.id}/edit`}
                          className="font-medium hover:underline"
                        >
                          {p.name}
                        </Link>
                        {!p.visibleAtPos && (
                          <span className="ml-2 text-xs text-neutral-400">
                            Masqué caisse
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">{p.category.name}</td>
                      <td className="px-3 py-2">{p.baseUnit.symbol}</td>
                      <td className="px-3 py-2">{p.salePrice}</td>
                      <td className="px-3 py-2">
                        {p.manageStock ? (
                          <span
                            className={
                              lowStock
                                ? "rounded bg-amber-100 px-2 py-0.5 text-amber-800"
                                : ""
                            }
                          >
                            {p.currentStock}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-2">{p.location?.name ?? "—"}</td>
                      <td className="px-3 py-2 text-right">
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="text-xs text-red-600 hover:underline"
                          >
                            Supprimer
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {products.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-6 text-center text-neutral-500"
                    >
                      Aucun produit.
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
                Page {meta.page} / {meta.totalPages} ({meta.total} produits)
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
        </div>
      )}
    </main>
  );
}
