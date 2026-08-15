import { SetMetadata } from "@nestjs/common";

export const PERMISSION_KEY = "requiredPermission";

// Équivalent Nest de middlewares/rbac.middleware.ts (requirePermission) —
// vérifié par PermissionsGuard contre request.user.permissions.
export const RequirePermission = (permissionKey: string) =>
  SetMetadata(PERMISSION_KEY, permissionKey);
