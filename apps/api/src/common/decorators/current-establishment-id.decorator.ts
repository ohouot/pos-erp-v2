import {
  createParamDecorator,
  BadRequestException,
  type ExecutionContext,
} from "@nestjs/common";
import type { AuthenticatedRequest } from "../types/authenticated-request.js";

// Équivalent de lib/requestContext.ts (currentEstablishmentId) — à utiliser
// uniquement sur des routes protégées par EstablishmentGuard, qui garantit
// déjà la présence de establishmentId.
export const CurrentEstablishmentId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.establishmentId) {
      throw new BadRequestException("Aucun établissement actif sélectionné");
    }
    return request.establishmentId;
  },
);
