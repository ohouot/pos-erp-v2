import type { Request } from "express";
import type { AuthenticatedUser } from "@pos-erp-v2/shared";

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
  establishmentId?: string;
}
