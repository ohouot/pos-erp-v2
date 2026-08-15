import { z } from "zod";
import { optional } from "./_helpers.js";

export const recipeIngredientInputSchema = z.object({
  ingredientProductId: z.string().min(1, "Produit ingrédient requis"),
  unitId: z.string().min(1, "Unité requise"),
  quantity: z.coerce.number().positive("Doit être supérieur à 0"),
});
export type RecipeIngredientInput = z.infer<typeof recipeIngredientInputSchema>;

// Une recette n'a de sens qu'avec au moins un ingrédient : sinon
// isComposed=true sans aucune consommation à déduire n'aurait pas de sens.
export const upsertRecipeSchema = z.object({
  notes: optional(z.string()),
  ingredients: z
    .array(recipeIngredientInputSchema)
    .min(1, "Au moins un ingrédient requis"),
});
export type UpsertRecipeInput = z.infer<typeof upsertRecipeSchema>;
