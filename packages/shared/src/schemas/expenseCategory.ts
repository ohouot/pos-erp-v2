import { z } from "zod";

export const createExpenseCategorySchema = z.object({
  name: z.string().min(1, "Nom requis"),
});
export type CreateExpenseCategoryInput = z.infer<
  typeof createExpenseCategorySchema
>;

export const updateExpenseCategorySchema = createExpenseCategorySchema;
export type UpdateExpenseCategoryInput = z.infer<
  typeof updateExpenseCategorySchema
>;
