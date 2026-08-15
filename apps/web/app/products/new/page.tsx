"use client";

import Link from "next/link";
import { ProductForm } from "@/components/products/ProductForm";

export default function NewProductPage() {
  return (
    <main className="flex min-h-screen flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Nouveau produit</h1>
        <Link
          href="/products"
          className="text-sm text-neutral-500 hover:underline"
        >
          ← Catalogue
        </Link>
      </div>
      <ProductForm />
    </main>
  );
}
