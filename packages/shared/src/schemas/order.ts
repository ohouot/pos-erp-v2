import { z } from "zod";
import { DISCOUNT_TYPES, ORDER_TYPES } from "../enums.js";
import { optional } from "./_helpers.js";

export const orderItemInputSchema = z.object({
  productId: z.string().min(1, "Produit requis"),
  quantity: z.coerce.number().positive("Doit être supérieur à 0"),
  // Niveau de prix appliqué (1 = salePrice standard, 2/3 = niveaux
  // optionnels du produit — voir orders.service.resolveItem). Retombe sur
  // salePrice si le niveau demandé n'est pas configuré pour ce produit.
  priceTier: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(1),
  discountAmount: z.coerce.number().min(0).default(0),
  // Remise du catalogue à appliquer à la ligne : si fourni, le serveur
  // recalcule discountAmount à partir de la définition (pourcentage/fixe),
  // ignorant la valeur ci-dessus — évite les erreurs de calcul manuel.
  discountId: optional(z.string()),
  notes: optional(z.string()),
});
export type OrderItemInput = z.infer<typeof orderItemInputSchema>;

export const createOrderSchema = z.object({
  orderType: z.enum(ORDER_TYPES).default("DINE_IN"),
  tableIds: z.array(z.string()).default([]),
  customerId: optional(z.string()),
  // Responsable rattaché à la vente, distinct du caissier qui encaisse
  // (résolu depuis le token d'authentification, jamais fourni par le client).
  administratorId: optional(z.string()),
  notes: optional(z.string()),
  items: z.array(orderItemInputSchema).default([]),
  // Identifiant généré côté client (caisse hors ligne) : rejoue idempotent
  // d'une synchronisation, voir orders.service.createOrder côté API et
  // apps/web/src/lib/offlineDb.ts côté client.
  clientTicketId: optional(z.string()),
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const updateOrderSchema = z.object({
  customerId: optional(z.string()),
  administratorId: optional(z.string()),
  notes: optional(z.string()),
});
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;

// Remise sur le ticket entier — distincte des remises par ligne, appliquée
// après elles sur le total déjà calculé (voir orders.pricing.applyGlobalDiscount).
// `type: null` efface la remise globale existante.
export const applyGlobalDiscountSchema = z.object({
  type: z.enum(DISCOUNT_TYPES).nullable(),
  value: z.coerce.number().min(0),
});
export type ApplyGlobalDiscountInput = z.infer<
  typeof applyGlobalDiscountSchema
>;

export const updateOrderItemSchema = z.object({
  quantity: z.coerce.number().positive("Doit être supérieur à 0").optional(),
  discountAmount: z.coerce.number().min(0).optional(),
  discountId: optional(z.string()),
  notes: optional(z.string()),
});
export type UpdateOrderItemInput = z.infer<typeof updateOrderItemSchema>;
