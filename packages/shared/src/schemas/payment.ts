import { z } from "zod";
import { optional } from "./_helpers.js";

// amountReceived n'est utile que pour la méthode de code "CASH" (calcul de
// la monnaie côté serveur) ; ignoré pour les autres modes.
export const createPaymentSchema = z.object({
  paymentMethodId: z.string().min(1, "Moyen de paiement requis"),
  amount: z.coerce.number().positive("Doit être supérieur à 0"),
  amountReceived: optional(z.coerce.number().min(0)),
  reference: optional(z.string()),
});
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
