// Fonctions pures (pas de dépendance React/réseau) — extraites pour être
// testables isolément, même pattern que l'écran caisse du projet de
// référence (apps/web/src/features/pos/lib/posCalculations.ts).

export interface CartLine {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  discountPct: number;
  priceTier: 1 | 2 | 3;
  categoryColor: string | null;
  currentStock: number;
  manageStock: boolean;
}

export interface ProductForPos {
  id: string;
  name: string;
  salePrice: string;
  salePrice2: string | null;
  salePrice3: string | null;
  currentStock: string;
  minStock: string;
  manageStock: boolean;
  imageUrl: string | null;
  categoryId: string;
  category: { id: string; name: string; color: string | null };
}

export function priceForTier(product: ProductForPos, tier: 1 | 2 | 3): number {
  const tierValue =
    tier === 2 ? product.salePrice2 : tier === 3 ? product.salePrice3 : null;
  return tierValue != null ? Number(tierValue) : Number(product.salePrice);
}

export function lineTotal(line: CartLine): number {
  const gross = line.unitPrice * line.quantity;
  return gross - gross * (line.discountPct / 100);
}

export function estimateTotal(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + lineTotal(line), 0);
}

export function cartQuantityForProduct(
  lines: CartLine[],
  productId: string,
): number {
  return lines
    .filter((l) => l.productId === productId)
    .reduce((sum, l) => sum + l.quantity, 0);
}

export function formatAmount(value: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(
    value,
  );
}

export function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace("#", "");
  const bigint = parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
