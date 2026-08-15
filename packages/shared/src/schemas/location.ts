import { z } from "zod";

export const createLocationSchema = z.object({
  name: z.string().min(1, "Nom requis"),
});
export type CreateLocationInput = z.infer<typeof createLocationSchema>;

export const updateLocationSchema = createLocationSchema.partial().extend({
  isActive: z.boolean().optional(),
});
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;
