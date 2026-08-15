import { z } from "zod";
import { optional } from "./_helpers.js";

export const startInventorySessionSchema = z.object({
  notes: optional(z.string()),
});
export type StartInventorySessionInput = z.infer<
  typeof startInventorySessionSchema
>;

export const recordInventoryItemSchema = z.object({
  productId: z.string().min(1, "Produit requis"),
  realQuantity: z.coerce.number().min(0),
  notes: optional(z.string()),
});
export type RecordInventoryItemInput = z.infer<
  typeof recordInventoryItemSchema
>;
