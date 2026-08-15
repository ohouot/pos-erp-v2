import { z } from "zod";
import { optional } from "./_helpers.js";

export const createBankAccountSchema = z.object({
  name: z.string().min(1, "Nom requis"),
  notes: optional(z.string()),
});
export type CreateBankAccountInput = z.infer<typeof createBankAccountSchema>;

export const updateBankAccountSchema = z.object({
  name: optional(z.string().min(1, "Nom requis")),
  notes: optional(z.string()),
  isActive: z.boolean().optional(),
});
export type UpdateBankAccountInput = z.infer<typeof updateBankAccountSchema>;

// Le sens (dépôt/retrait) est déterminé par la route appelée (/deposit ou
// /withdraw), pas par ce champ — même convention que cashMovementSchema.
export const bankMovementSchema = z.object({
  amount: z.coerce.number().positive("Doit être supérieur à 0"),
  reason: optional(z.string()),
});
export type BankMovementInput = z.infer<typeof bankMovementSchema>;
