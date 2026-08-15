import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { RolesRepository } from "./roles.repository.js";

// Le Super Administrateur doit toujours conserver l'intégralité des
// permissions : c'est la porte de secours qui permet de reconfigurer tous
// les autres rôles.
const PROTECTED_ROLE_NAME = "Super Administrateur";

@Injectable()
export class RolesService {
  constructor(private readonly rolesRepository: RolesRepository) {}

  listRoles() {
    return this.rolesRepository.findAll();
  }

  listPermissionsCatalog() {
    return this.rolesRepository.findAllPermissions();
  }

  async updateRolePermissions(roleId: string, permissionKeys: string[]) {
    const role = await this.rolesRepository.findById(roleId);
    if (!role) {
      throw new NotFoundException("Rôle introuvable");
    }
    if (role.name === PROTECTED_ROLE_NAME) {
      throw new BadRequestException(
        "Les permissions du Super Administrateur ne peuvent pas être modifiées",
      );
    }
    const updated = await this.rolesRepository.replacePermissions(
      roleId,
      permissionKeys,
    );
    if (!updated) {
      throw new NotFoundException("Rôle introuvable");
    }
    return updated;
  }
}
