import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service.js";

// Visible par un utilisateur : diffusée à tout l'établissement (userId nul)
// ou adressée spécifiquement à lui.
function visibilityFilter(userId: string): Prisma.NotificationWhereInput {
  return { OR: [{ userId: null }, { userId }] };
}

export interface CreateNotificationData {
  establishmentId: string;
  userId?: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

@Injectable()
export class NotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: CreateNotificationData) {
    return this.prisma.notification.create({
      data: {
        establishmentId: input.establishmentId,
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        data: input.data as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async findAllPaginated(
    establishmentId: string,
    userId: string,
    params: { page: number; pageSize: number; unreadOnly?: boolean },
  ) {
    const where: Prisma.NotificationWhereInput = {
      establishmentId,
      ...visibilityFilter(userId),
      ...(params.unreadOnly ? { isRead: false } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return { data, total };
  }

  countUnread(establishmentId: string, userId: string) {
    return this.prisma.notification.count({
      where: { establishmentId, isRead: false, ...visibilityFilter(userId) },
    });
  }

  findById(establishmentId: string, userId: string, id: string) {
    return this.prisma.notification.findFirst({
      where: { id, establishmentId, ...visibilityFilter(userId) },
    });
  }

  markRead(id: string) {
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  markAllRead(establishmentId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { establishmentId, isRead: false, ...visibilityFilter(userId) },
      data: { isRead: true },
    });
  }

  // Anti-spam : évite de recréer une alerte identique tant que la précédente
  // n'a pas été lue (ex. "stock faible" répété à chaque vente du même produit).
  async hasUnreadOfType(
    establishmentId: string,
    type: string,
    dataMatch?: Record<string, unknown>,
  ): Promise<boolean> {
    const existing = await this.prisma.notification.findFirst({
      where: {
        establishmentId,
        type,
        isRead: false,
        ...(dataMatch
          ? { data: { equals: dataMatch as Prisma.InputJsonValue } }
          : {}),
      },
    });
    return existing !== null;
  }
}
