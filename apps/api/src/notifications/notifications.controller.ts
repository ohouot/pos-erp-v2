import {
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { NotificationsService } from "./notifications.service.js";
import { EstablishmentGuard } from "../common/guards/establishment.guard.js";
import { CurrentEstablishmentId } from "../common/decorators/current-establishment-id.decorator.js";
import { CurrentUser } from "../common/decorators/current-user.decorator.js";
import type { AuthenticatedUser } from "@pos-erp-v2/shared";
import { ListNotificationsQueryDto } from "./dto/list-notifications-query.dto.js";

// Personnelles par nature (chacun ne voit que ses propres notifications +
// celles diffusées à tout l'établissement) : pas de permission RBAC
// spécifique, comme le pointage de présence en libre-service (Lot 8).
@Controller("notifications")
@UseGuards(EstablishmentGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(
    @CurrentEstablishmentId() establishmentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListNotificationsQueryDto,
  ) {
    return this.notificationsService.list(establishmentId, user.id, {
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
      unreadOnly: query.unreadOnly,
    });
  }

  @Get("unread-count")
  async unreadCount(
    @CurrentEstablishmentId() establishmentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return {
      count: await this.notificationsService.countUnread(
        establishmentId,
        user.id,
      ),
    };
  }

  @Post(":id/read")
  async markRead(
    @CurrentEstablishmentId() establishmentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return {
      notification: await this.notificationsService.markRead(
        establishmentId,
        user.id,
        id,
      ),
    };
  }

  @Post("read-all")
  @HttpCode(204)
  async markAllRead(
    @CurrentEstablishmentId() establishmentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.notificationsService.markAllRead(establishmentId, user.id);
  }
}
