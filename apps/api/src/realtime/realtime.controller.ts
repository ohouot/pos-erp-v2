import { Controller, Get, UseGuards } from "@nestjs/common";
import { AblyService } from "./ably.service.js";
import { EstablishmentGuard } from "../common/guards/establishment.guard.js";
import { CurrentEstablishmentId } from "../common/decorators/current-establishment-id.decorator.js";

// Utile uniquement sur le chemin de déploiement Ably (serverless) — le chemin
// Socket.io s'authentifie directement par JWT au handshake, sans échange de
// token préalable. Toujours monté (coût nul si ABLY_API_KEY est absente,
// l'initialisation du client Ably reste paresseuse côté AblyService).
@Controller("realtime")
@UseGuards(EstablishmentGuard)
export class RealtimeController {
  constructor(private readonly ably: AblyService) {}

  @Get("token")
  token(@CurrentEstablishmentId() establishmentId: string) {
    return this.ably.createEstablishmentTokenRequest(establishmentId);
  }
}
