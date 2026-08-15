import { Body, Controller, Get, HttpCode, Patch, Post } from "@nestjs/common";
import { UsersService } from "./users.service.js";
import { AuditService } from "../audit/audit.service.js";
import { CurrentUser } from "../common/decorators/current-user.decorator.js";
import { RequirePermission } from "../common/decorators/require-permission.decorator.js";
import type { AuthenticatedUser } from "@pos-erp-v2/shared";
import { UpdateMeDto } from "./dto/update-me.dto.js";
import { ChangeMyPasswordDto } from "./dto/change-my-password.dto.js";
import { SetMyPinDto } from "./dto/set-my-pin.dto.js";
import { CreateUserDto } from "./dto/create-user.dto.js";

@Controller("users")
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly auditService: AuditService,
  ) {}

  @Get("me")
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    return { user: await this.usersService.getMe(user.id) };
  }

  @Patch("me")
  async updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpdateMeDto,
  ) {
    const updated = await this.usersService.updateMe(user.id, body);
    this.auditService.record({
      userId: user.id,
      action: "USER_PROFILE_UPDATED",
      entityType: "User",
      entityId: user.id,
    });
    return { user: updated };
  }

  @Post("me/change-password")
  @HttpCode(204)
  async changeMyPassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: ChangeMyPasswordDto,
  ) {
    await this.usersService.changeMyPassword(user.id, body);
    this.auditService.record({
      userId: user.id,
      action: "USER_PASSWORD_CHANGED",
      entityType: "User",
      entityId: user.id,
    });
  }

  @Post("me/pin")
  @HttpCode(204)
  async setMyPin(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: SetMyPinDto,
  ) {
    await this.usersService.setMyPin(user.id, body);
    this.auditService.record({
      userId: user.id,
      action: "USER_PIN_UPDATED",
      entityType: "User",
      entityId: user.id,
    });
  }

  @Post()
  @RequirePermission("users:create")
  async createUser(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() body: CreateUserDto,
  ) {
    const result = await this.usersService.createUser(body);
    this.auditService.record({
      userId: currentUser.id,
      action: "USER_CREATED",
      entityType: "User",
      entityId: result.user.id,
    });
    return result;
  }
}
