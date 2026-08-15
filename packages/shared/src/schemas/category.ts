import { z } from "zod";
import { optional } from "./_helpers.js";

export const createCategorySchema = z.object({
  name: z.string().min(1, "Nom requis"),
  description: optional(z.string()),
  imageUrl: optional(z.string().url("URL invalide")),
  color: optional(
    z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur hex invalide"),
  ),
  parentId: optional(z.string()),
});
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = createCategorySchema.partial().extend({
  isActive: z.boolean().optional(),
});
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
