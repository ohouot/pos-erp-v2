import { z } from "zod";
import { optional } from "./_helpers.js";

export const createSupplierSchema = z.object({
  name: z.string().min(1, "Nom requis"),
  contactName: optional(z.string()),
  phone: optional(z.string()),
  email: optional(z.string().email("Email invalide")),
  address: optional(z.string()),
  notes: optional(z.string()),
});
export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;

export const updateSupplierSchema = createSupplierSchema.partial().extend({
  isActive: z.boolean().optional(),
});
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
