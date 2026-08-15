import { z } from "zod";

// Les clés inconnues du catalogue `permissions` sont ignorées côté service
// (voir roles.repository.replacePermissions) plutôt que rejetées ici : pas
// besoin de dupliquer le catalogue canonique (ALL_PERMISSIONS) dans un enum
// Zod qu'il faudrait resynchroniser à chaque nouvelle permission.
export const updateRolePermissionsSchema = z.object({
  permissionKeys: z.array(z.string()),
});
export type UpdateRolePermissionsInput = z.infer<
  typeof updateRolePermissionsSchema
>;
