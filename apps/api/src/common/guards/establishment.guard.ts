import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
} from "@nestjs/common";
import type { AuthenticatedRequest } from "../types/authenticated-request.js";

// Équivalent de middlewares/tenant.middleware.ts (requireEstablishment) —
// vérifie uniquement la présence de establishmentId dans le token (posé par
// JwtAuthGuard) ; ne revérifie pas l'accès à chaque requête, car le token
// n'a pu être émis avec cet establishmentId que via /establishments/:id/select,
// qui a déjà vérifié l'accès au moment de l'émission.
@Injectable()
export class EstablishmentGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.establishmentId) {
      throw new BadRequestException("Aucun établissement actif sélectionné");
    }
    return true;
  }
}
