import { Logger } from "@nestjs/common";
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import type { Server, Socket } from "socket.io";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";

export function establishmentRoom(establishmentId: string): string {
  return `establishment:${establishmentId}`;
}

interface AccessTokenPayload {
  sub: string;
  establishmentId?: string;
}

// Chemin VPS/Docker : connexion WebSocket persistante, authentifiée par le
// même JWT access token que l'API REST (transmis via `socket.handshake.auth.token`).
// Une room par établissement, dérivée de l'établissement actif déjà embarqué
// dans le token — le client reconnecte le socket à chaque changement de
// token (login, refresh, changement d'établissement).
// `origin: true` (reflète l'origine de la requête) plutôt que CLIENT_URL en
// dur : les options du décorateur sont évaluées à l'import de la classe,
// avant que ConfigModule n'ait chargé les variables d'environnement — la
// vraie frontière de sécurité est de toute façon le handshake JWT ci-dessous,
// pas le CORS du transport WebSocket.
@WebSocketGateway({ cors: { origin: true, credentials: true } })
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  handleConnection(socket: Socket): void {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) throw new Error("Token manquant");
      const payload = this.jwtService.verify<AccessTokenPayload>(token, {
        secret: this.config.get<string>("JWT_ACCESS_SECRET"),
      });
      socket.data.userId = payload.sub;
      socket.data.establishmentId = payload.establishmentId;
      if (payload.establishmentId) {
        socket.join(establishmentRoom(payload.establishmentId));
      }
      this.logger.debug(
        `Socket connecté ${socket.id} (établissement ${payload.establishmentId ?? "—"})`,
      );
    } catch {
      socket.disconnect(true);
    }
  }

  handleDisconnect(socket: Socket): void {
    this.logger.debug(`Socket déconnecté ${socket.id}`);
  }

  emitToEstablishment(
    establishmentId: string,
    event: string,
    payload: unknown,
  ): void {
    this.server?.to(establishmentRoom(establishmentId)).emit(event, payload);
  }
}
