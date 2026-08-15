import type { Gender } from "../enums.js";

export interface AuthenticatedEstablishmentMembership {
  establishmentId: string;
  establishmentName: string;
  roleId: string;
  roleName: string;
}

// Utilisateur authentifié tel que renvoyé par l'API (login, refresh, /users/me)
// et consommé par le store d'authentification frontend. Les permissions sont
// l'union de celles de tous les rôles de l'utilisateur (un par établissement) ;
// un Super Administrateur a implicitement toutes les permissions.
export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  gender: Gender | null;
  // Jamais le PIN lui-même (hashé, ni transmis) — juste de quoi afficher
  // "code défini" ou proposer d'en créer un dans Mon profil.
  hasPinCode: boolean;
  isSuperAdmin: boolean;
  permissions: string[];
  establishments: AuthenticatedEstablishmentMembership[];
}

// Voir auth.verifyPin — confirmation d'identité pour une action sensible,
// pas un changement de session/permissions.
export interface ApproverCandidate {
  id: string;
  name: string;
}

export interface VerifyPinResult {
  approverId: string;
  approverName: string;
}
