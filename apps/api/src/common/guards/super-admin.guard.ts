import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import type { AuthenticatedRequest } from "../types/authenticated-request.js";

// Équivalent de middlewares/superAdmin.middleware.ts — opérations
// cross-tenant (sauvegardes...), indépendant du système RBAC par permission.
@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user?.isSuperAdmin) {
      throw new ForbiddenException("Réservé au Super Administrateur");
    }
    return true;
  }
}
