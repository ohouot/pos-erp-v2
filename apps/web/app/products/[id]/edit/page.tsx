"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useNestApi } from "@/hooks/useNestApi";
import {
  ProductForm,
  type ProductFormValue,
} from "@/components/products/ProductForm";

interface RawProduct {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  barcode: string | null;
  baseUnitId: string;
  purchasePrice: string;
  salePrice: string;
  salePrice2: string | null;
  salePrice3: string | null;
  minSalePrice: string | null;
  taxRate: string;
  minStock: string;
  expirationDate: string | null;
  locationId: string | null;
  preferredSupplierId: string | null;
  manageStock: boolean;
  visibleAtPos: boolean;
  visibleOnPurchaseOrder: boolean;
  visibleOnlineStore: boolean;
  isComposed: boolean;
  packagingUnits: Array<{
    unitId: string;
    conversionToBase: string;
    isPurchaseUnit: boolean;
    isSaleUnit: boolean;
    barcode: string | null;
  }>;
}

function toFormValue(p: RawProduct): ProductFormValue {
  return {
    id: p.id,
    categoryId: p.categoryId,
    name: p.name,
    description: p.description ?? undefined,
    imageUrl: p.imageUrl ?? undefined,
    barcode: p.barcode ?? undefined,
    baseUnitId: p.baseUnitId,
    purchasePrice: Number(p.purchasePrice),
    salePrice: Number(p.salePrice),
    salePrice2: p.salePrice2 != null ? Number(p.salePrice2) : undefined,
    salePrice3: p.salePrice3 != null ? Number(p.salePrice3) : undefined,
    minSalePrice: p.minSalePrice != null ? Number(p.minSalePrice) : undefined,
    taxRate: Number(p.taxRate),
    minStock: Number(p.minStock),
    expirationDate: p.expirationDate
      ? (p.expirationDate.slice(0, 10) as unknown as Date)
      : undefined,
    locationId: p.locationId ?? undefined,
    preferredSupplierId: p.preferredSupplierId ?? undefined,
    manageStock: p.manageStock,
    visibleAtPos: p.visibleAtPos,
    visibleOnPurchaseOrder: p.visibleOnPurchaseOrder,
    visibleOnlineStore: p.visibleOnlineStore,
    isComposed: p.isComposed,
    packagingUnits: p.packagingUnits.map((u) => ({
      unitId: u.unitId,
      conversionToBase: Number(u.conversionToBase),
      isPurchaseUnit: u.isPurchaseUnit,
      isSaleUnit: u.isSaleUnit,
      barcode: u.barcode ?? undefined,
    })),
  };
}

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const { authFetch } = useNestApi();
  const [product, setProduct] = useState<ProductFormValue | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    authFetch(`/products/${id}`)
      .then(async (res) => {
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        const data = (await res.json()) as { product: RawProduct };
        setProduct(toFormValue(data.product));
      })
      .catch(() => setNotFound(true));
  }, [authFetch, id]);

  return (
    <main className="flex min-h-screen flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Modifier le produit</h1>
        <Link
          href="/products"
          className="text-sm text-neutral-500 hover:underline"
        >
          ← Catalogue
        </Link>
      </div>
      {notFound && <p className="text-sm text-red-600">Produit introuvable.</p>}
      {!notFound && !product && (
        <p className="text-sm text-neutral-500">Chargement...</p>
      )}
      {product && <ProductForm product={product} />}
    </main>
  );
}
