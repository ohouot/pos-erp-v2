import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PERMISSION_KEY } from "../decorators/require-permission.decorator.js";
import type { AuthenticatedRequest } from "../types/authenticated-request.js";

// Équivalent Nest de middlewares/rbac.middleware.ts (requirePermission) —
// no-op si la route ne porte pas @RequirePermission(). Le bypass Super
// Admin est déjà résolu en amont (request.user.permissions contient tout,
// voir UsersRepository.toAuthenticatedUser), donc une simple vérification
// .includes() suffit ici.
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const permissionKey = this.reflector.getAllAndOverride<string>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!permissionKey) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user) {
      throw new UnauthorizedException();
    }
    if (!request.user.permissions.includes(permissionKey)) {
      throw new ForbiddenException(`Permission requise : ${permissionKey}`);
    }
    return true;
  }
}
