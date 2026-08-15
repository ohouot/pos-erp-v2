import { z } from "zod";
import { ESTABLISHMENT_TYPES } from "../enums.js";
import { optional } from "./_helpers.js";

// Sous-ensemble de paramètres libres (format de ticket, pied de page...) —
// stocké dans Establishment.settings (Json), volontairement souple pour ne
// pas multiplier les colonnes à chaque nouveau réglage.
export const establishmentSettingsSchema = z
  .object({
    printFormat: optional(z.enum(["A4", "80MM", "58MM"])),
    receiptFooter: optional(z.string()),
    // Heure (0-23) à laquelle la "journée commerciale" bascule, distincte
    // du jour calendaire (ex: un bar ouvert jusqu'à 3h du matin veut que
    // les ventes de 1h soient rattachées à la journée de la veille).
    // Absent = 0 = comportement calendaire inchangé.
    businessDayStartHour: optional(z.coerce.number().int().min(0).max(23)),
    // Niveau de prix (1/2/3) présélectionné à l'ouverture de l'écran
    // caisse — reste modifiable en session, voir Product.salePrice2/3.
    defaultPriceTier: optional(
      z.union([z.literal(1), z.literal(2), z.literal(3)]),
    ),
    // Limite indicative de numéros de file par journée commerciale (accueil
    // client) — absent = pas de limite.
    dailyQueueLimit: optional(z.coerce.number().int().min(1)),
    // Voir cashier.service.closeSession : point d'intégration email
    // préparé mais pas branché tant qu'aucun fournisseur SMTP n'est choisi
    // (voir apps/api/src/modules/auth/auth.service.ts pour le même
    // traitement sur la réinitialisation de mot de passe).
    sendClosureEmail: optional(z.boolean()),
  })
  .partial();
export type EstablishmentSettings = z.infer<typeof establishmentSettingsSchema>;

export const createEstablishmentSchema = z.object({
  name: z.string().min(1, "Nom requis"),
  type: z.enum(ESTABLISHMENT_TYPES),
  logoUrl: optional(z.string().url("URL invalide")),
  address: optional(z.string()),
  phone: optional(z.string()),
  email: optional(z.string().email("Email invalide")),
  currency: z.string().min(1).default("XOF"),
  taxRate: z.coerce.number().min(0).max(100).default(0),
  language: z.string().min(1).default("fr"),
  timezone: z.string().min(1).default("Africa/Abidjan"),
  settings: establishmentSettingsSchema.optional(),
});
export type CreateEstablishmentInput = z.infer<
  typeof createEstablishmentSchema
>;

export const updateEstablishmentSchema = createEstablishmentSchema
  .partial()
  .extend({
    isActive: z.boolean().optional(),
  });
export type UpdateEstablishmentInput = z.infer<
  typeof updateEstablishmentSchema
>;
