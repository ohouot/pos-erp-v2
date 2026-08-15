import { z } from "zod";
import { optional } from "./_helpers.js";

export const createEmployeeSchema = z.object({
  email: z.string().email("Email invalide"),
  firstName: z.string().min(1, "Prénom requis"),
  lastName: z.string().min(1, "Nom requis"),
  phone: optional(z.string()),
  roleId: z.string().min(1, "Rôle requis"),
  vendorCode: optional(z.string()),
  position: optional(z.string()),
  salary: optional(z.coerce.number().min(0)),
  hireDate: optional(z.coerce.date()),
  contractType: optional(z.string()),
  notes: optional(z.string()),
});
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;

export const updateEmployeeSchema = z.object({
  roleId: optional(z.string()),
  isActive: z.boolean().optional(),
  vendorCode: optional(z.string()),
  position: optional(z.string()),
  salary: optional(z.coerce.number().min(0)),
  hireDate: optional(z.coerce.date()),
  contractType: optional(z.string()),
  notes: optional(z.string()),
});
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
