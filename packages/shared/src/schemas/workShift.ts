import { z } from "zod";
import { optional } from "./_helpers.js";

export const createWorkShiftSchema = z
  .object({
    employeeId: z.string().min(1, "Employé requis"),
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
    role: optional(z.string()),
    notes: optional(z.string()),
  })
  .refine((data) => data.endTime > data.startTime, {
    message: "L'heure de fin doit être après l'heure de début",
    path: ["endTime"],
  });
export type CreateWorkShiftInput = z.infer<typeof createWorkShiftSchema>;
