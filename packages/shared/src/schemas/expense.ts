import { z } from "zod";
import { optional } from "./_helpers.js";

export const createExpenseSchema = z.object({
  categoryId: z.string().min(1, "Catégorie requise"),
  amount: z.coerce.number().positive("Doit être supérieur à 0"),
  description: optional(z.string()),
  expenseDate: optional(z.coerce.date()),
  receiptUrl: optional(z.string()),
});
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;

export const updateExpenseSchema = createExpenseSchema.partial();
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
