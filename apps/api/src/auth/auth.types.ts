import type { AuthenticatedUser } from "@pos-erp-v2/shared";

export interface LoginResult {
  user: AuthenticatedUser;
  accessToken: string;
  refreshToken: string;
}
