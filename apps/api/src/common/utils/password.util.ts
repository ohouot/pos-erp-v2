import * as bcrypt from "bcrypt";
import { randomBytes } from "node:crypto";

const SALT_ROUNDS = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

const TEMP_PASSWORD_ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";

// Mot de passe temporaire pour un compte créé par un administrateur — à
// communiquer une seule fois, l'utilisateur doit le changer ensuite.
export function generateTemporaryPassword(length = 14): string {
  const bytes = randomBytes(length);
  return Array.from(
    bytes,
    (byte) => TEMP_PASSWORD_ALPHABET[byte % TEMP_PASSWORD_ALPHABET.length],
  ).join("");
}
