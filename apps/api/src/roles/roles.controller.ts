import { Body, Controller, Get, Param, Patch } from "@nestjs/common";
import { RolesService } from "./roles.service.js";
import { AuditService } from "../audit/audit.service.js";
import { RequirePermission } from "../common/decorators/require-permission.decorator.js";
import { CurrentUser } from "../common/decorators/current-user.decorator.js";
import type { AuthenticatedUser } from "@pos-erp-v2/shared";
import { UpdateRolePermissionsDto } from "./dto/update-role-permissions.dto.js";

@Controller("roles")
export class RolesController {
  constructor(
    private readonly rolesService: RolesService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  @RequirePermission("roles:read")
  async list() {
    return { roles: await this.rolesService.listRoles() };
  }

  @Get("permissions")
  @RequirePermission("roles:read")
  async listPermissions() {
    return { permissions: await this.rolesService.listPermissionsCatalog() };
  }

  @Patch(":id/permissions")
  @RequirePermission("roles:update")
  async updatePermissions(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id") id: string,
    @Body() body: UpdateRolePermissionsDto,
  ) {
    const role = await this.rolesService.updateRolePermissions(
      id,
      body.permissionKeys,
    );
    this.auditService.record({
      userId: currentUser.id,
      action: "ROLE_PERMISSIONS_UPDATED",
      entityType: "Role",
      entityId: id,
    });
    return { role };
  }
}
