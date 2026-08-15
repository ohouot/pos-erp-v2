import { z } from "zod";

export const createUnitSchema = z.object({
  name: z.string().min(1, "Nom requis"),
  symbol: z.string().min(1, "Symbole requis"),
});
export type CreateUnitInput = z.infer<typeof createUnitSchema>;
