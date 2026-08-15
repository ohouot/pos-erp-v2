import { z } from "zod";
import { optional } from "./_helpers.js";

export const purchaseItemInputSchema = z.object({
  productId: z.string().min(1, "Produit requis"),
  unitId: z.string().min(1, "Unité requise"),
  quantity: z.coerce.number().positive("Doit être supérieur à 0"),
  purchasePrice: z.coerce.number().min(0),
  suggestedSalePrice: optional(z.coerce.number().min(0)),
});
export type PurchaseItemInput = z.infer<typeof purchaseItemInputSchema>;

// totalAmount n'est jamais reçu du client : recalculé côté serveur à partir
// des lignes, pour ne jamais faire confiance à un total envoyé par le
// navigateur.
export const createPurchaseSchema = z.object({
  supplierId: z.string().min(1, "Fournisseur requis"),
  invoiceNumber: optional(z.string()),
  // Chaîne (pas Date) : correspond directement à la valeur native d'un
  // <input type="date">, sans conversion à faire des deux côtés. Prisma
  // accepte une chaîne ISO pour un champ DateTime sans coercion préalable.
  purchaseDate: optional(z.string()),
  observation: optional(z.string()),
  items: z.array(purchaseItemInputSchema).min(1, "Au moins un article requis"),
});
export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;

export const updatePurchaseSchema = createPurchaseSchema.partial();
export type UpdatePurchaseInput = z.infer<typeof updatePurchaseSchema>;
