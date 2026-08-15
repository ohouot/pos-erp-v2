import { z } from "zod";
import { optional } from "./_helpers.js";

// Unité d'achat/vente alternative pour un produit, avec facteur de
// conversion vers son unité de base (ex: Casier, conversionToBase=24, pour
// un produit stocké en Bouteille).
export const productUnitSchema = z.object({
  unitId: z.string().min(1, "Unité requise"),
  conversionToBase: z.coerce.number().positive("Doit être supérieur à 0"),
  isPurchaseUnit: z.boolean().default(false),
  isSaleUnit: z.boolean().default(false),
  barcode: optional(z.string()),
});
export type ProductUnitInput = z.infer<typeof productUnitSchema>;

// Objet de base séparé du schéma final (qui porte un .refine()) : un
// ZodEffects n'a pas de .partial(), updateProductSchema doit donc dériver
// de cet objet brut, pas de createProductSchema.
const productObjectSchema = z.object({
  categoryId: z.string().min(1, "Catégorie requise"),
  name: z.string().min(1, "Nom requis"),
  description: optional(z.string()),
  imageUrl: optional(z.string().url("URL invalide")),
  barcode: optional(z.string()),
  baseUnitId: z.string().min(1, "Unité de base requise"),
  purchasePrice: z.coerce.number().min(0),
  salePrice: z.coerce.number().min(0),
  // Niveaux de prix additionnels optionnels (happy hour, VIP...) — voir
  // schema.prisma Product.salePrice2/3.
  salePrice2: optional(z.coerce.number().min(0)),
  salePrice3: optional(z.coerce.number().min(0)),
  // Plancher de prix : jamais sélectionnable en caisse (voir
  // salePrice/2/3 ci-dessus), plafonne uniquement les remises de ligne à
  // la vente — voir orders.service.assertAboveMinPrice.
  minSalePrice: optional(z.coerce.number().min(0)),
  taxRate: z.coerce.number().min(0).max(100).default(0),
  minStock: z.coerce.number().min(0).default(0),
  // Coercée en Date (pas juste z.string()) : Prisma exige un DateTime
  // ISO-8601 complet pour la colonne, une chaîne "YYYY-MM-DD" seule
  // (valeur brute d'un <input type="date">) est rejetée telle quelle.
  expirationDate: optional(z.coerce.date()),
  locationId: optional(z.string()),
  preferredSupplierId: optional(z.string()),
  manageStock: z.boolean().default(true),
  visibleAtPos: z.boolean().default(true),
  visibleOnPurchaseOrder: z.boolean().default(true),
  visibleOnlineStore: z.boolean().default(false),
  isComposed: z.boolean().default(false),
  packagingUnits: z.array(productUnitSchema).default([]),
});

// Une fiche produit où le plancher dépasserait un des prix de vente
// configurés n'aurait aucun sens (aucune remise ne pourrait jamais
// s'appliquer) — rejetée dès la saisie plutôt que découverte à la vente.
function respectsMinSalePrice(data: {
  minSalePrice?: number;
  salePrice?: number;
  salePrice2?: number;
  salePrice3?: number;
}) {
  if (data.minSalePrice == null) return true;
  return [data.salePrice, data.salePrice2, data.salePrice3].every(
    (price) => price == null || price >= data.minSalePrice!,
  );
}
const minSalePriceRefinement = {
  message:
    "Le prix de vente minimum autorisé ne peut pas dépasser un prix de vente",
  path: ["minSalePrice"],
};

export const createProductSchema = productObjectSchema.refine(
  respectsMinSalePrice,
  minSalePriceRefinement,
);
export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = productObjectSchema
  .partial()
  .extend({ isActive: z.boolean().optional() })
  .refine(respectsMinSalePrice, minSalePriceRefinement);
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
