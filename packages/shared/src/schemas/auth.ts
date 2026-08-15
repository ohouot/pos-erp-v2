import { z } from "zod";
import { ESTABLISHMENT_TYPES, GENDERS } from "../enums.js";

export const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "8 caractères minimum"),
});
export type LoginInput = z.infer<typeof loginSchema>;

// Auto-inscription publique : crée à la fois le compte (propriétaire) et son
// premier établissement en un seul geste — voir auth.service.register. Le
// compte obtient automatiquement le rôle système "Administrateur" (tous
// droits sauf suppression de l'établissement) sur cet établissement.
export const registerSchema = z.object({
  firstName: z.string().min(1, "Prénom requis"),
  lastName: z.string().min(1, "Nom requis"),
  email: z.string().email("Email invalide"),
  phone: z.string().optional(),
  password: z
    .string()
    .min(8, "8 caractères minimum")
    .regex(/[A-Z]/, "Au moins une majuscule")
    .regex(/[0-9]/, "Au moins un chiffre"),
  establishmentName: z.string().min(1, "Nom de l'établissement requis"),
  establishmentType: z.enum(ESTABLISHMENT_TYPES),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const verifyEmailSchema = z.object({
  token: z.string().min(1, "Token requis"),
});
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

export const requestPasswordResetSchema = z.object({
  email: z.string().email("Email invalide"),
});
export type RequestPasswordResetInput = z.infer<
  typeof requestPasswordResetSchema
>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token requis"),
  password: z
    .string()
    .min(8, "8 caractères minimum")
    .regex(/[A-Z]/, "Au moins une majuscule")
    .regex(/[0-9]/, "Au moins un chiffre"),
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// roleId/establishmentId sont optionnels mais liés : un utilisateur peut être
// créé sans affectation immédiate (ex. avant qu'un établissement existe),
// mais on ne peut pas assigner un rôle sans préciser à quel établissement il
// s'applique, ni l'inverse.
export const createUserSchema = z
  .object({
    email: z.string().email("Email invalide"),
    firstName: z.string().min(1, "Prénom requis"),
    lastName: z.string().min(1, "Nom requis"),
    phone: z.string().optional(),
    roleId: z.string().min(1).optional(),
    establishmentId: z.string().min(1).optional(),
  })
  .refine((data) => Boolean(data.roleId) === Boolean(data.establishmentId), {
    message: "roleId et establishmentId doivent être fournis ensemble",
    path: ["roleId"],
  });
export type CreateUserInput = z.infer<typeof createUserSchema>;

// Auto-service : chacun édite son propre profil, y compris son email de
// connexion (unicité vérifiée côté service) — mais jamais le rôle ni les
// permissions depuis cet écran, qui restent du ressort d'un administrateur
// (voir /employees, /roles).
export const updateMeSchema = z.object({
  firstName: z.string().min(1, "Prénom requis").optional(),
  lastName: z.string().min(1, "Nom requis").optional(),
  phone: z.string().optional(),
  email: z.string().email("Email invalide").optional(),
  avatarUrl: z.string().optional(),
  gender: z.enum(GENDERS).optional(),
});
export type UpdateMeInput = z.infer<typeof updateMeSchema>;

export const changeMyPasswordSchema = z.object({
  currentPassword: z.string().min(1, "Mot de passe actuel requis"),
  newPassword: z
    .string()
    .min(8, "8 caractères minimum")
    .regex(/[A-Z]/, "Au moins une majuscule")
    .regex(/[0-9]/, "Au moins un chiffre"),
});
export type ChangeMyPasswordInput = z.infer<typeof changeMyPasswordSchema>;

// Code court (pas un mot de passe) permettant de confirmer/journaliser qui
// approuve une action sensible (annulation, remise) sans changer de
// session — voir auth.verifyPin. Optionnel, surtout pertinent pour un
// Administrateur/Gérant susceptible d'être appelé en renfort.
export const setMyPinSchema = z.object({
  pinCode: z.string().regex(/^[0-9]{4,6}$/, "4 à 6 chiffres"),
});
export type SetMyPinInput = z.infer<typeof setMyPinSchema>;

export const verifyPinSchema = z.object({
  userId: z.string().min(1, "Approbateur requis"),
  pinCode: z.string().min(1, "Code requis"),
  permission: z.string().min(1, "Permission requise"),
});
export type VerifyPinInput = z.infer<typeof verifyPinSchema>;

export const listApproversQuerySchema = z.object({
  permission: z.string().min(1, "Permission requise"),
});
export type ListApproversQuery = z.infer<typeof listApproversQuerySchema>;
