import { z } from "zod";
import { optional } from "./_helpers.js";

export const createReservationSchema = z
  .object({
    customerId: optional(z.string()),
    tableId: optional(z.string()),
    startTime: z.coerce.date(),
    endTime: optional(z.coerce.date()),
    partySize: z.coerce.number().int().positive().default(1),
    notes: optional(z.string()),
  })
  .refine((data) => !data.endTime || data.endTime > data.startTime, {
    message: "L'heure de fin doit être après l'heure de début",
    path: ["endTime"],
  });
export type CreateReservationInput = z.infer<typeof createReservationSchema>;

export const updateReservationSchema = z
  .object({
    customerId: optional(z.string()),
    tableId: optional(z.string()),
    startTime: optional(z.coerce.date()),
    endTime: optional(z.coerce.date()),
    partySize: z.coerce.number().int().positive().optional(),
    notes: optional(z.string()),
  })
  .refine(
    (data) => !data.startTime || !data.endTime || data.endTime > data.startTime,
    {
      message: "L'heure de fin doit être après l'heure de début",
      path: ["endTime"],
    },
  );
export type UpdateReservationInput = z.infer<typeof updateReservationSchema>;
