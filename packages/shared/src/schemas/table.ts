import { z } from "zod";
import { TABLE_STATUSES } from "../enums.js";
import { optional } from "./_helpers.js";

export const createTableSchema = z.object({
  name: z.string().min(1, "Nom requis"),
  capacity: z.coerce.number().int().positive().default(4),
  zone: optional(z.string()),
  positionX: z.coerce.number().int().default(0),
  positionY: z.coerce.number().int().default(0),
});
export type CreateTableInput = z.infer<typeof createTableSchema>;

export const updateTableSchema = createTableSchema.partial().extend({
  status: z.enum(TABLE_STATUSES).optional(),
});
export type UpdateTableInput = z.infer<typeof updateTableSchema>;
