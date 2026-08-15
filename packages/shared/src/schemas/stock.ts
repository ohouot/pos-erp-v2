import { z } from "zod";

export const stockAdjustmentSchema = z.object({
  productId: z.string().min(1, "Produit requis"),
  type: z.enum(["ADJUSTMENT_IN", "ADJUSTMENT_OUT"]),
  quantity: z.coerce.number().positive("Doit être supérieur à 0"),
  reason: z.string().min(1, "Motif requis"),
});
export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;
