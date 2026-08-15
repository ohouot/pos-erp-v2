import { z } from "zod";
import { optional } from "./_helpers.js";

export const createPaymentMethodSchema = z.object({
  code: z
    .string()
    .min(1, "Code requis")
    .regex(/^[A-Z0-9_]+$/, "Majuscules, chiffres et _ uniquement"),
  label: z.string().min(1, "Libellé requis"),
  displayOrder: z.coerce.number().int().default(0),
});
export type CreatePaymentMethodInput = z.infer<
  typeof createPaymentMethodSchema
>;

// `code` n'est jamais modifiable après création : c'est l'identifiant
// stable utilisé pour reconnaître le paiement en espèces (calcul de la
// monnaie) et pour les rapports — le renommer casserait cette détection.
export const updatePaymentMethodSchema = z.object({
  label: optional(z.string().min(1, "Libellé requis")),
  displayOrder: z.coerce.number().int().optional(),
  isActive: z.boolean().optional(),
});
export type UpdatePaymentMethodInput = z.infer<
  typeof updatePaymentMethodSchema
>;
