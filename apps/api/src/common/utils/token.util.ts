import { randomBytes, createHash } from "node:crypto";

// Valeur opaque à haute entropie (pas un JWT) : seul son hash SHA-256 est
// stocké en base, pour pouvoir la révoquer/faire tourner sans jamais
// conserver la valeur brute (refresh token, tokens de vérification email et
// de réinitialisation de mot de passe partagent ce même mécanisme).
export function generateOpaqueToken(): string {
  return randomBytes(64).toString("hex");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
