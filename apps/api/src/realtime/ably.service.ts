import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Rest } from "ably";

export function establishmentChannel(establishmentId: string): string {
  return `establishment:${establishmentId}`;
}

// Client REST (pas Realtime) : chaque appel serveur publie un message isolé
// sans connexion persistante — le seul mode compatible avec des fonctions
// serverless. Le navigateur, lui, ouvre une vraie connexion Ably.Realtime
// directement vers Ably (voir apps/web/src/hooks/useRealtimeSocket.ts) pour
// recevoir ces publications en temps réel.
@Injectable()
export class AblyService {
  private readonly logger = new Logger(AblyService.name);
  private rest: Rest | null = null;

  constructor(private readonly config: ConfigService) {}

  // Initialisation paresseuse : ABLY_API_KEY n'est jamais définie sur le
  // chemin VPS/Docker (Socket.io y est utilisé à la place, voir
  // RealtimeService) — construire le client au démarrage du module ferait
  // planter le process (`new Rest({ key: undefined })` jette immédiatement).
  private getRest(): Rest {
    if (!this.rest) {
      this.rest = new Rest({ key: this.config.get<string>("ABLY_API_KEY") });
    }
    return this.rest;
  }

  emitToEstablishment(
    establishmentId: string,
    event: string,
    payload: unknown,
  ): void {
    this.getRest()
      .channels.get(establishmentChannel(establishmentId))
      .publish(event, payload)
      .catch((error: unknown) => {
        this.logger.error("Échec de publication Ably", error as Error);
      });
  }

  // Token de courte durée scopé en lecture seule au channel de
  // l'établissement actif — le navigateur ne reçoit jamais la clé API brute.
  createEstablishmentTokenRequest(establishmentId: string) {
    return this.getRest().auth.createTokenRequest({
      capability: { [establishmentChannel(establishmentId)]: ["subscribe"] },
    });
  }
}
