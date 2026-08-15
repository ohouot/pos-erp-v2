import { z } from "zod";
import { optional } from "./_helpers.js";

export const openCashSessionSchema = z.object({
  openingBalance: z.coerce.number().min(0),
  notes: optional(z.string()),
});
export type OpenCashSessionInput = z.infer<typeof openCashSessionSchema>;

// Le sens (dépôt/retrait) est déterminé par la route appelée
// (/deposit ou /withdraw), pas par ce champ : permet un contrôle de
// permission distinct par sens (cashier:deposit / cashier:withdraw).
export const cashMovementSchema = z.object({
  amount: z.coerce.number().positive("Doit être supérieur à 0"),
  reason: optional(z.string()),
});
export type CashMovementInput = z.infer<typeof cashMovementSchema>;

export const closeCashSessionSchema = z.object({
  closingBalanceCounted: z.coerce.number().min(0),
  notes: optional(z.string()),
});
export type CloseCashSessionInput = z.infer<typeof closeCashSessionSchema>;
