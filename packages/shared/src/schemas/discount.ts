import { z } from "zod";
import { DISCOUNT_TYPES } from "../enums.js";
import { optional } from "./_helpers.js";

const baseDiscountSchema = z.object({
  name: z.string().min(1, "Nom requis"),
  type: z.enum(DISCOUNT_TYPES),
  value: z.coerce.number().positive("Doit être supérieur à 0"),
  code: optional(z.string()),
  startDate: optional(z.coerce.date()),
  endDate: optional(z.coerce.date()),
});

export const createDiscountSchema = baseDiscountSchema.refine(
  (data) => data.type !== "PERCENTAGE" || data.value <= 100,
  { message: "Un pourcentage ne peut pas dépasser 100", path: ["value"] },
);
export type CreateDiscountInput = z.infer<typeof baseDiscountSchema>;

// Pas de re-vérification du plafond à 100% ici : une mise à jour partielle
// peut ne renvoyer que "value" sans "type", contexte insuffisant pour
// re-valider la règle sans recharger l'enregistrement existant.
export const updateDiscountSchema = baseDiscountSchema
  .partial()
  .extend({ isActive: z.boolean().optional() });
export type UpdateDiscountInput = z.infer<typeof updateDiscountSchema>;
