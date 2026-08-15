import type { Response } from "express";
import { parseDurationMs } from "./duration.util.js";

export const REFRESH_TOKEN_COOKIE = "refreshToken";

// Le cookie n'est envoyé que sur les routes /auth (refresh, logout) :
// inutile de le transmettre à chaque requête API. httpOnly + sameSite=strict
// empêchent toute lecture/usage depuis du JS tiers.
export function setRefreshTokenCookie(
  res: Response,
  token: string,
  refreshExpiresIn: string,
  isProduction: boolean,
): void {
  res.cookie(REFRESH_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    path: "/api/v1/auth",
    maxAge: parseDurationMs(refreshExpiresIn),
  });
}

export function clearRefreshTokenCookie(
  res: Response,
  isProduction: boolean,
): void {
  res.clearCookie(REFRESH_TOKEN_COOKIE, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    path: "/api/v1/auth",
  });
}
