"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  createProductSchema,
  type CreateProductInput,
} from "@pos-erp-v2/shared";
import { useNestApi } from "@/hooks/useNestApi";

interface Option {
  id: string;
  name: string;
}

interface UnitOption extends Option {
  symbol: string;
}

export interface ProductFormValue extends CreateProductInput {
  id?: string;
}

export function ProductForm({ product }: { product?: ProductFormValue }) {
  const router = useRouter();
  const { authFetch } = useNestApi();
  const isEdit = Boolean(product?.id);

  const [categories, setCategories] = useState<Option[]>([]);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [locations, setLocations] = useState<Option[]>([]);
  const [suppliers, setSuppliers] = useState<Option[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CreateProductInput>({
    resolver: zodResolver(createProductSchema),
    defaultValues: product ?? {
      categoryId: "",
      name: "",
      baseUnitId: "",
      purchasePrice: 0,
      salePrice: 0,
      taxRate: 0,
      minStock: 0,
      manageStock: true,
      visibleAtPos: true,
      visibleOnPurchaseOrder: true,
      visibleOnlineStore: false,
      isComposed: false,
      packagingUnits: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "packagingUnits",
  });

  useEffect(() => {
    Promise.all([
      authFetch("/categories").then((r) => r.json()),
      authFetch("/units").then((r) => r.json()),
      authFetch("/locations").then((r) => r.json()),
      authFetch("/suppliers").then((r) => r.json()),
    ]).then(([c, u, l, s]) => {
      setCategories(c.categories);
      setUnits(u.units);
      setLocations(l.locations);
      setSuppliers(s.suppliers);
    });
  }, [authFetch]);

  const purchasePrice = watch("purchasePrice");
  const salePrice = watch("salePrice");
  const margin = Number(salePrice ?? 0) - Number(purchasePrice ?? 0);
  const marginPct =
    Number(purchasePrice) > 0 ? (margin / Number(purchasePrice)) * 100 : 0;

  async function onSubmit(values: CreateProductInput) {
    setServerError(null);
    setIsSubmitting(true);
    const url = isEdit ? `/products/${product!.id}` : "/products";
    const res = await authFetch(url, {
      method: isEdit ? "PATCH" : "POST",
      body: JSON.stringify(values),
    });
    setIsSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setServerError(
        Array.isArray(body?.message)
          ? body.message.join(", ")
          : (body?.message ?? "Échec de l'enregistrement"),
      );
      return;
    }
    router.push("/products");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex max-w-2xl flex-col gap-8 pb-16"
    >
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-neutral-500">
          Identification
        </h2>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Désignation</label>
          <input
            {...register("name")}
            className="rounded border border-neutral-300 px-3 py-2"
          />
          {errors.name && (
            <p className="text-xs text-red-600">{errors.name.message}</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Unité de mesure</label>
            <select
              {...register("baseUnitId")}
              className="rounded border border-neutral-300 px-3 py-2"
            >
              <option value="">—</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.symbol})
                </option>
              ))}
            </select>
            {errors.baseUnitId && (
              <p className="text-xs text-red-600">
                {errors.baseUnitId.message}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Code-barres</label>
            <input
              {...register("barcode")}
              placeholder="Laisser vide pour générer automatiquement"
              className="rounded border border-neutral-300 px-3 py-2"
            />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-neutral-500">
          Classification
        </h2>
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Famille</label>
            <select
              {...register("categoryId")}
              className="rounded border border-neutral-300 px-3 py-2"
            >
              <option value="">—</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.categoryId && (
              <p className="text-xs text-red-600">
                {errors.categoryId.message}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Emplacement</label>
            <select
              {...register("locationId")}
              className="rounded border border-neutral-300 px-3 py-2"
            >
              <option value="">—</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">
              Fournisseur préférentiel
            </label>
            <select
              {...register("preferredSupplierId")}
              className="rounded border border-neutral-300 px-3 py-2"
            >
              <option value="">—</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-neutral-500">Tarification</h2>
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Prix d&apos;achat</label>
            <input
              type="number"
              step="0.01"
              {...register("purchasePrice", { valueAsNumber: true })}
              className="rounded border border-neutral-300 px-3 py-2"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Prix de vente</label>
            <input
              type="number"
              step="0.01"
              {...register("salePrice", { valueAsNumber: true })}
              className="rounded border border-neutral-300 px-3 py-2"
            />
            {errors.salePrice && (
              <p className="text-xs text-red-600">{errors.salePrice.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Marge</label>
            <p
              className={`rounded border border-transparent px-3 py-2 ${margin < 0 ? "text-red-600" : "text-neutral-600"}`}
            >
              {margin.toFixed(2)} ({marginPct.toFixed(0)}%)
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">
              Prix de vente 2 (ex: happy hour)
            </label>
            <input
              type="number"
              step="0.01"
              {...register("salePrice2", {
                valueAsNumber: true,
                setValueAs: (v) => (v === "" ? undefined : Number(v)),
              })}
              className="rounded border border-neutral-300 px-3 py-2"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">
              Prix de vente 3 (ex: tarif VIP)
            </label>
            <input
              type="number"
              step="0.01"
              {...register("salePrice3", {
                valueAsNumber: true,
                setValueAs: (v) => (v === "" ? undefined : Number(v)),
              })}
              className="rounded border border-neutral-300 px-3 py-2"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">
              Prix de vente minimum autorisé
            </label>
            <input
              type="number"
              step="0.01"
              {...register("minSalePrice", {
                valueAsNumber: true,
                setValueAs: (v) => (v === "" ? undefined : Number(v)),
              })}
              placeholder="Plancher pour les remises en caisse"
              className="rounded border border-neutral-300 px-3 py-2"
            />
            {errors.minSalePrice && (
              <p className="text-xs text-red-600">
                {errors.minSalePrice.message}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-neutral-500">Stock</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">
              Seuil d&apos;alerte stock bas
            </label>
            <input
              type="number"
              step="0.001"
              {...register("minStock", { valueAsNumber: true })}
              className="rounded border border-neutral-300 px-3 py-2"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">
              Date d&apos;expiration
            </label>
            <input
              type="date"
              {...register("expirationDate")}
              className="rounded border border-neutral-300 px-3 py-2"
            />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-neutral-500">
          Visibilité &amp; comportement
        </h2>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register("manageStock")} /> Soustraire
          automatiquement du stock à la vente
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register("visibleAtPos")} /> Afficher à la
          caisse
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register("visibleOnPurchaseOrder")} />{" "}
          Afficher sur les bons de commande fournisseur
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register("visibleOnlineStore")} /> Afficher
          sur la boutique en ligne
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register("isComposed")} /> Produit composé
          (recette)
        </label>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-neutral-500">
          Unités d&apos;emballage / conversion
        </h2>
        <p className="text-xs text-neutral-500">Ex : 1 Casier = 24 Bouteille</p>
        {fields.map((field, index) => (
          <div key={field.id} className="flex items-end gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs">Unité</label>
              <Controller
                control={control}
                name={`packagingUnits.${index}.unitId`}
                render={({ field: f }) => (
                  <select
                    {...f}
                    className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
                  >
                    <option value="">—</option>
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                )}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs">= combien d&apos;unités de base</label>
              <input
                type="number"
                step="0.0001"
                {...register(`packagingUnits.${index}.conversionToBase`, {
                  valueAsNumber: true,
                })}
                className="w-32 rounded border border-neutral-300 px-2 py-1.5 text-sm"
              />
            </div>
            <label className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                {...register(`packagingUnits.${index}.isPurchaseUnit`)}
              />{" "}
              Achat
            </label>
            <label className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                {...register(`packagingUnits.${index}.isSaleUnit`)}
              />{" "}
              Vente
            </label>
            <button
              type="button"
              onClick={() => remove(index)}
              className="text-xs text-red-600 hover:underline"
            >
              Retirer
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            append({
              unitId: "",
              conversionToBase: 1,
              isPurchaseUnit: false,
              isSaleUnit: false,
            })
          }
          className="w-fit rounded border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100"
        >
          Ajouter une unité d&apos;emballage
        </button>
      </section>

      <section className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold text-neutral-500">Description</h2>
        <textarea
          {...register("description")}
          rows={4}
          className="rounded border border-neutral-300 px-3 py-2"
        />
      </section>

      {serverError && <p className="text-sm text-red-600">{serverError}</p>}

      <div className="sticky bottom-0 flex gap-3 border-t border-neutral-200 bg-white py-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {isSubmitting
            ? "Enregistrement..."
            : isEdit
              ? "Enregistrer"
              : "Créer le produit"}
        </button>
      </div>
    </form>
  );
}
