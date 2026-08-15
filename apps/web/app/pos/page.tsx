"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useNestApi } from "@/hooks/useNestApi";
import { useConnectivityStore } from "@/stores/connectivity.store";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { LiveClock } from "@/features/pos/components/LiveClock";
import {
  type CartLine,
  type ProductForPos,
  priceForTier,
  lineTotal,
  estimateTotal,
  cartQuantityForProduct,
  formatAmount,
  hexToRgba,
} from "@/features/pos/lib/posCalculations";

interface Category {
  id: string;
  name: string;
  color: string | null;
}

interface CreatedOrder {
  id: string;
  orderNumber: string;
  totalAmount: string;
}

export default function PosPage() {
  const { data: session } = useSession();
  const { authFetch } = useNestApi();
  const isOnline = useConnectivityStore((s) => s.isOnline);
  const searchRef = useRef<HTMLInputElement>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<ProductForPos[]>([]);
  const [activeCategory, setActiveCategory] = useState("");
  const [priceTier, setPriceTier] = useState<1 | 2 | 3>(1);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [flash, setFlash] = useState<{
    productId: string;
    key: number;
    blocked?: boolean;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<CreatedOrder | null>(null);

  useEffect(() => {
    authFetch("/categories")
      .then((res) => res.json())
      .then((data: { categories: Category[] }) =>
        setCategories(data.categories),
      )
      .catch(() => setCategories([]));
    authFetch("/products?pageSize=200")
      .then((res) => res.json())
      .then((data: { products: ProductForPos[] }) => setProducts(data.products))
      .catch(() => setProducts([]));
  }, [authFetch]);

  const filteredProducts = products.filter((p) => {
    if (activeCategory && p.categoryId !== activeCategory) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  const addToCart = useCallback(
    (product: ProductForPos) => {
      const inCart = cartQuantityForProduct(cart, product.id);
      const available = Number(product.currentStock) - inCart;
      if (product.manageStock && available < 1) {
        setFlash({ productId: product.id, key: Date.now(), blocked: true });
        setTimeout(() => setFlash(null), 900);
        return;
      }
      setFlash({ productId: product.id, key: Date.now() });
      setTimeout(() => setFlash(null), 550);

      setCart((prev) => {
        const existing = prev.find(
          (l) => l.productId === product.id && l.priceTier === priceTier,
        );
        if (existing) {
          return prev.map((l) =>
            l === existing ? { ...l, quantity: l.quantity + 1 } : l,
          );
        }
        return [
          ...prev,
          {
            productId: product.id,
            name: product.name,
            unitPrice: priceForTier(product, priceTier),
            quantity: 1,
            discountPct: 0,
            priceTier,
            categoryColor: product.category.color,
            currentStock: Number(product.currentStock),
            manageStock: product.manageStock,
          },
        ];
      });
    },
    [cart, priceTier],
  );

  function updateQuantity(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((l) =>
          l.productId === productId
            ? { ...l, quantity: Math.max(0, l.quantity + delta) }
            : l,
        )
        .filter((l) => l.quantity > 0),
    );
  }

  function updateDiscount(productId: string, pct: number) {
    setCart((prev) =>
      prev.map((l) =>
        l.productId === productId ? { ...l, discountPct: pct } : l,
      ),
    );
  }

  function removeLine(productId: string) {
    setCart((prev) => prev.filter((l) => l.productId !== productId));
  }

  function resetSale() {
    setCart([]);
    setCreatedOrder(null);
    setErrorMsg(null);
  }

  const total = estimateTotal(cart);

  async function handleCheckout(pay: boolean) {
    if (cart.length === 0 || isSubmitting) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const createRes = await authFetch("/orders", {
        method: "POST",
        body: JSON.stringify({
          orderType: "TAKEAWAY",
          tableIds: [],
          items: cart.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            priceTier: l.priceTier,
            discountAmount: (l.unitPrice * l.quantity * l.discountPct) / 100,
          })),
        }),
      });
      if (!createRes.ok) {
        const body = await createRes.json().catch(() => null);
        throw new Error(body?.message ?? "Échec de la création de la commande");
      }
      const { order } = (await createRes.json()) as {
        order: { id: string; orderNumber: string };
      };

      const sendRes = await authFetch(`/orders/${order.id}/send-to-kitchen`, {
        method: "POST",
      });
      if (!sendRes.ok) {
        const body = await sendRes.json().catch(() => null);
        throw new Error(body?.message ?? "Échec de l'envoi en cuisine");
      }

      if (pay) {
        const methodsRes = await authFetch("/payment-methods?active=true");
        const { paymentMethods } = (await methodsRes.json()) as {
          paymentMethods: { id: string; code: string }[];
        };
        const cashMethod =
          paymentMethods.find((m) => m.code === "CASH") ?? paymentMethods[0];
        if (cashMethod) {
          const payRes = await authFetch(`/orders/${order.id}/payments`, {
            method: "POST",
            body: JSON.stringify({
              paymentMethodId: cashMethod.id,
              amount: total,
            }),
          });
          if (!payRes.ok) {
            const body = await payRes.json().catch(() => null);
            throw new Error(body?.message ?? "Échec de l'encaissement");
          }
        }
      }

      setCreatedOrder({
        id: order.id,
        orderNumber: order.orderNumber,
        totalAmount: String(total),
      });
      setCart([]);
    } catch (error) {
      setErrorMsg(
        error instanceof Error ? error.message : "Une erreur est survenue",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if (isSubmitting || createdOrder) return;
      if (e.key === "F2") {
        e.preventDefault();
        handleCheckout(true);
      } else if (e.key === "F4") {
        e.preventDefault();
        handleCheckout(false);
      }
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, isSubmitting, createdOrder, total]);

  if (createdOrder) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 animate-fade-in">
        <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-success to-success/70 text-2xl text-primary-foreground shadow-sm shadow-success/30">
          ✓
        </div>
        <h1 className="text-2xl font-semibold">
          Commande {createdOrder.orderNumber}
        </h1>
        <p className="text-muted-foreground">Vente enregistrée avec succès.</p>
        <div className="flex gap-3">
          <Link
            href={`/orders/${createdOrder.id}`}
            className="rounded border border-neutral-300 px-4 py-2 text-sm"
          >
            Voir la commande
          </Link>
          <button
            onClick={resetSale}
            className="rounded bg-success px-4 py-2 text-sm font-medium text-white"
          >
            Nouvelle vente
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col gap-3 p-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between rounded-xl border bg-gradient-to-r from-primary/10 via-card to-card px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-xl text-primary-foreground shadow-sm shadow-primary/30">
            🛒
          </div>
          <div>
            <h1 className="text-xl font-semibold">Caisse</h1>
            <p className="text-xs text-muted-foreground">
              {session?.user.firstName} {session?.user.lastName}
            </p>
          </div>
        </div>
        <LiveClock />
      </div>

      {!isOnline && (
        <div className="animate-fade-in rounded-lg border border-warning/30 bg-warning/10 px-4 py-2 text-sm text-warning">
          📵 Hors ligne — les ventes ne peuvent pas être finalisées depuis cet
          écran pour le moment.
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card px-3 py-2 shadow-sm">
        <Link
          href="/"
          className="rounded border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100"
        >
          Accueil
        </Link>
        <button
          onClick={resetSale}
          disabled={cart.length === 0}
          className="rounded border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100 disabled:opacity-50"
        >
          ↺ Nouvelle vente
        </button>
        <Link
          href="/cashier"
          className="rounded border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100"
        >
          Session de caisse
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_380px]">
        {/* Product catalogue */}
        <div className="flex flex-col gap-3">
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un produit..."
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm shadow-sm"
          />

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCategory("")}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm transition-all hover:scale-105 active:scale-95 ${
                activeCategory === ""
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-neutral-300"
              }`}
            >
              Toutes les familles
            </button>
            {categories.map((c) => {
              const color = c.color ?? "#94a3b8";
              const active = activeCategory === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveCategory(c.id)}
                  className="rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm transition-all hover:scale-105 active:scale-95"
                  style={{
                    borderColor: color,
                    backgroundColor: active ? color : hexToRgba(color, 0.12),
                    color: active ? "#fff" : undefined,
                    boxShadow: active
                      ? `0 4px 12px -2px ${hexToRgba(color, 0.5)}`
                      : undefined,
                  }}
                >
                  {c.name}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-lg border bg-card p-1 shadow-sm sm:w-64">
            {([1, 2, 3] as const).map((tier) => (
              <button
                key={tier}
                onClick={() => setPriceTier(tier)}
                className={`rounded px-3 py-1.5 text-xs font-medium ${
                  priceTier === tier
                    ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-md shadow-primary/20"
                    : "text-muted-foreground"
                }`}
              >
                Prix {tier}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
            {filteredProducts.map((product) => {
              const stock = Number(product.currentStock);
              const minStock = Number(product.minStock);
              const outOfStock = product.manageStock && stock <= 0;
              const lowStock =
                product.manageStock && !outOfStock && stock <= minStock;
              const accent = product.category.color ?? "#94a3b8";
              const isFlashing = flash?.productId === product.id;

              return (
                <div
                  key={product.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => addToCart(product)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") addToCart(product);
                  }}
                  className={`relative flex cursor-pointer flex-col overflow-hidden rounded-lg border bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98] ${
                    outOfStock ? "opacity-60 grayscale" : ""
                  }`}
                  style={{ borderTopWidth: 3, borderTopColor: accent }}
                >
                  <div
                    className="flex h-24 items-center justify-center text-2xl"
                    style={{ backgroundColor: hexToRgba(accent, 0.1) }}
                  >
                    📦
                  </div>
                  {product.manageStock && (
                    <span
                      className={`absolute left-1 top-1 rounded-full px-2 py-0.5 text-[10px] font-medium text-white ${
                        outOfStock
                          ? "bg-destructive"
                          : lowStock
                            ? "bg-warning"
                            : "bg-neutral-500"
                      }`}
                    >
                      {outOfStock ? "Rupture" : stock}
                    </span>
                  )}
                  {isFlashing && (
                    <div
                      className={`absolute inset-0 flex items-center justify-center ${
                        flash?.blocked ? "bg-destructive/15" : "bg-primary/15"
                      }`}
                    >
                      <span className="animate-zoom-in rounded-full bg-white px-2 py-1 text-xs font-bold shadow">
                        {flash?.blocked ? "Rupture !" : "+1"}
                      </span>
                    </div>
                  )}
                  <div className="flex flex-col gap-0.5 p-2">
                    <p className="line-clamp-2 text-sm font-medium">
                      {product.name}
                    </p>
                    <p className="font-bold text-primary">
                      {formatAmount(priceForTier(product, priceTier))}
                    </p>
                  </div>
                </div>
              );
            })}
            {filteredProducts.length === 0 && (
              <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
                Aucun produit.
              </p>
            )}
          </div>
        </div>

        {/* Ticket */}
        <div className="flex h-fit flex-col overflow-hidden rounded-xl border bg-card shadow-md">
          <div className="flex items-center justify-between bg-gradient-to-r from-primary/10 to-transparent px-4 py-3">
            <span className="font-medium">🧾 Ticket en cours</span>
            {cart.length > 0 && (
              <span className="animate-zoom-in rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                {cart.length}
              </span>
            )}
          </div>

          <div className="m-3 rounded-md border border-dashed">
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 bg-muted/50 px-2 py-1 text-[10px] uppercase text-muted-foreground">
              <span>Désignation</span>
              <span>Qté</span>
              <span>Remise %</span>
              <span>Total</span>
            </div>
            <div className="max-h-64 divide-y divide-dashed overflow-y-auto">
              {cart.map((line) => (
                <div
                  key={`${line.productId}-${line.priceTier}`}
                  className="animate-slide-in-right grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 px-2 py-1.5 text-sm"
                >
                  <div className="truncate">
                    <p className="truncate">{line.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatAmount(line.unitPrice)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateQuantity(line.productId, -1)}
                      className="h-5 w-5 rounded border text-xs"
                    >
                      −
                    </button>
                    <span className="w-6 text-center">{line.quantity}</span>
                    <button
                      onClick={() => updateQuantity(line.productId, 1)}
                      disabled={
                        line.manageStock && line.quantity >= line.currentStock
                      }
                      className="h-5 w-5 rounded border text-xs disabled:opacity-30"
                    >
                      +
                    </button>
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={line.discountPct}
                    onChange={(e) =>
                      updateDiscount(line.productId, Number(e.target.value))
                    }
                    className="w-12 rounded border px-1 py-0.5 text-xs"
                  />
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-medium">
                      {formatAmount(lineTotal(line))}
                    </span>
                    <button
                      onClick={() => removeLine(line.productId)}
                      className="text-destructive"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))}
              {cart.length === 0 && (
                <p className="px-2 py-8 text-center text-sm text-muted-foreground">
                  Panier vide — sélectionnez un produit.
                </p>
              )}
            </div>
          </div>

          <div className="mx-3 flex flex-col gap-1 border-t border-dashed pt-2 text-sm">
            <div className="flex justify-between rounded-md bg-gradient-to-r from-primary/10 to-primary/5 px-2 py-1.5">
              <span className="font-bold">TOTAL</span>
              <span className="text-xl font-bold text-primary">
                <AnimatedNumber value={total} format={formatAmount} />
              </span>
            </div>
            <p className="pb-2 text-xs text-muted-foreground">
              Total indicatif — recalculé et vérifié par le serveur à la
              validation.
            </p>
          </div>

          {errorMsg && (
            <p className="mx-3 mb-2 text-sm text-destructive">{errorMsg}</p>
          )}

          {isOnline && (
            <div className="flex gap-2 border-t p-3">
              <button
                onClick={() => handleCheckout(false)}
                disabled={cart.length === 0 || isSubmitting}
                className="flex-1 rounded border border-neutral-300 px-3 py-2 text-sm disabled:opacity-50"
              >
                Envoyer sans encaisser
              </button>
              <button
                onClick={() => handleCheckout(true)}
                disabled={cart.length === 0 || isSubmitting}
                className={`flex-[2] rounded bg-gradient-to-r from-primary to-primary/85 px-3 py-2 text-sm font-semibold text-primary-foreground shadow active:scale-[0.97] disabled:opacity-50 ${
                  cart.length > 0 && !isSubmitting ? "animate-pulse-glow" : ""
                }`}
              >
                {isSubmitting ? "..." : "Encaisser (F2)"}
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
