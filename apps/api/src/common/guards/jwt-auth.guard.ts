import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator.js";
import { UsersRepository } from "../../users/users.repository.js";
import type { AuthenticatedRequest } from "../types/authenticated-request.js";

export interface AccessTokenPayload {
  sub: string;
  establishmentId?: string;
}

// Équivalent Nest de middlewares/auth.middleware.ts (requireAuth) : lit le
// Bearer token, vérifie sa signature, puis re-résout l'utilisateur complet
// (permissions incluses) depuis la base à chaque requête — aucun raccourci
// de confiance sur le seul contenu du payload JWT.
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly usersRepository: UsersRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (isPublic) {
      return true;
    }

    const header = request.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Session invalide ou expirée");
    }

    let payload: AccessTokenPayload;
    try {
      payload = this.jwtService.verify<AccessTokenPayload>(
        header.slice("Bearer ".length),
      );
    } catch {
      throw new UnauthorizedException("Session invalide ou expirée");
    }

    const user = await this.usersRepository.findAuthenticatedUserById(
      payload.sub,
    );
    if (!user) {
      throw new UnauthorizedException("Session invalide ou expirée");
    }

    request.user = user;
    request.establishmentId = payload.establishmentId;
    return true;
  }
}
