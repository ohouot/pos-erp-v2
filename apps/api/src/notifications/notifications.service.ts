import { Injectable, NotFoundException } from "@nestjs/common";
import type { NotificationType } from "@pos-erp-v2/shared";
import { NotificationsRepository } from "./notifications.repository.js";
import { RealtimeService } from "../realtime/realtime.service.js";

export interface NotifyInput {
  establishmentId: string;
  userId?: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly notificationsRepository: NotificationsRepository,
    private readonly realtimeService: RealtimeService,
  ) {}

  // Point d'entrée unique pour toute notification métier : persiste (pour la
  // cloche de notifications / historique) puis diffuse en direct sur la room
  // de l'établissement. userId absent = diffusée à tout l'établissement
  // plutôt qu'à une personne précise.
  async notify(input: NotifyInput) {
    const notification = await this.notificationsRepository.create(input);
    this.realtimeService.emitToEstablishment(
      input.establishmentId,
      "notification",
      notification,
    );
    return notification;
  }

  async list(
    establishmentId: string,
    userId: string,
    params: { page: number; pageSize: number; unreadOnly?: boolean },
  ) {
    const { data, total } = await this.notificationsRepository.findAllPaginated(
      establishmentId,
      userId,
      params,
    );
    return {
      data,
      meta: {
        page: params.page,
        pageSize: params.pageSize,
        total,
        totalPages: Math.ceil(total / params.pageSize),
      },
    };
  }

  countUnread(establishmentId: string, userId: string) {
    return this.notificationsRepository.countUnread(establishmentId, userId);
  }

  async markRead(establishmentId: string, userId: string, id: string) {
    const notification = await this.notificationsRepository.findById(
      establishmentId,
      userId,
      id,
    );
    if (!notification) throw new NotFoundException("Notification introuvable");
    return this.notificationsRepository.markRead(id);
  }

  async markAllRead(establishmentId: string, userId: string): Promise<void> {
    await this.notificationsRepository.markAllRead(establishmentId, userId);
  }
}
