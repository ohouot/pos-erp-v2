import { z } from "zod";
import { optional } from "./_helpers.js";

export const createCustomerSchema = z.object({
  firstName: z.string().min(1, "Prénom requis"),
  lastName: optional(z.string()),
  phone: optional(z.string()),
  email: optional(z.string().email("Email invalide")),
  address: optional(z.string()),
  notes: optional(z.string()),
});
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

export const updateCustomerSchema = createCustomerSchema.partial().extend({
  isActive: z.boolean().optional(),
});
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
