// Fonctions pures (pas de Prisma) : le prix unitaire et le taux de TVA
// d'une ligne sont figés au moment de l'ajout (copiés depuis le produit),
// jamais recalculés depuis le catalogue par la suite.

export interface ProductPriceTiers {
  salePrice: number;
  salePrice2?: number | null;
  salePrice3?: number | null;
}

// Retombe sur le prix standard si le niveau demandé (happy hour, VIP...)
// n'est pas configuré pour ce produit.
export function resolvePriceForTier(
  product: ProductPriceTiers,
  tier: 1 | 2 | 3,
): number {
  const tierValue =
    tier === 2 ? product.salePrice2 : tier === 3 ? product.salePrice3 : null;
  return tierValue != null ? Number(tierValue) : Number(product.salePrice);
}

// Prix unitaire effectif après remise de ligne — c'est cette valeur qui est
// comparée au plancher (minSalePrice), jamais le prix unitaire brut.
export function computeEffectiveUnitPrice(
  quantity: number,
  unitPrice: number,
  discountAmount: number,
): number {
  return unitPrice - discountAmount / quantity;
}

export interface LineTotals {
  grossAmount: number;
  taxAmount: number;
  totalPrice: number;
}

// HT (après remise) -> TVA ajoutée par-dessus -> TTC. taxRate est un
// pourcentage (0-100).
export function computeLineTotals(
  unitPrice: number,
  quantity: number,
  taxRate: number,
  discountAmount: number,
): LineTotals {
  const grossAmount = unitPrice * quantity;
  const netOfDiscount = grossAmount - discountAmount;
  const taxAmount = netOfDiscount * (taxRate / 100);
  const totalPrice = netOfDiscount + taxAmount;
  return { grossAmount, taxAmount, totalPrice };
}

export interface OrderTotals {
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
}

export function computeOrderTotals(
  items: Array<{
    unitPrice: number;
    quantity: number;
    taxRate: number;
    discountAmount: number;
  }>,
): OrderTotals {
  let subtotal = 0;
  let taxAmount = 0;
  let discountAmount = 0;
  let totalAmount = 0;

  for (const item of items) {
    const line = computeLineTotals(
      item.unitPrice,
      item.quantity,
      item.taxRate,
      item.discountAmount,
    );
    subtotal += line.grossAmount;
    taxAmount += line.taxAmount;
    discountAmount += item.discountAmount;
    totalAmount += line.totalPrice;
  }

  return { subtotal, taxAmount, discountAmount, totalAmount };
}

// Remise globale du ticket, appliquée après les remises de ligne (déjà
// agrégées dans totalAmount) — jamais sous 0.
export function applyGlobalDiscount(
  totalAmount: number,
  type: "PERCENTAGE" | "FIXED" | null | undefined,
  value: number | null | undefined,
): number {
  if (!type || value == null) return totalAmount;
  const discounted =
    type === "PERCENTAGE"
      ? totalAmount * (1 - value / 100)
      : totalAmount - value;
  return Math.max(0, discounted);
}
