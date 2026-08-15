import type { Unit } from "./unit.js";

export interface RecipeIngredient {
  id: string;
  recipeId: string;
  ingredientProductId: string;
  unitId: string;
  quantity: string; // Decimal sérialisé en string
  ingredientProduct?: { id: string; name: string };
  unit?: Unit;
}

export interface Recipe {
  id: string;
  productId: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  ingredients: RecipeIngredient[];
}
