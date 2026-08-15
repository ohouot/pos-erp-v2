import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RealtimeGateway } from "./realtime.gateway.js";
import { AblyService } from "./ably.service.js";

// Point de bascule serveur unique — contrairement au projet de référence, où
// chaque service métier importait directement `realtime/socket.ts` en dur :
// sur le déploiement serverless (Ably), `initSocket()` n'y est jamais appelé
// (pas de serveur HTTP long-vivant), donc `io` restait `null` et
// `emitToEstablishment` échouait silencieusement — aucun événement n'était
// réellement publié. Ici, un seul point d'injection (`RealtimeService`)
// choisit le transport à l'exécution selon la présence d'`ABLY_API_KEY`, pour
// que les deux chemins de déploiement émettent réellement leurs événements.
@Injectable()
export class RealtimeService {
  constructor(
    private readonly gateway: RealtimeGateway,
    private readonly ably: AblyService,
    private readonly config: ConfigService,
  ) {}

  emitToEstablishment(
    establishmentId: string,
    event: string,
    payload: unknown,
  ): void {
    if (this.config.get<string>("ABLY_API_KEY")) {
      this.ably.emitToEstablishment(establishmentId, event, payload);
      return;
    }
    this.gateway.emitToEstablishment(establishmentId, event, payload);
  }
}
