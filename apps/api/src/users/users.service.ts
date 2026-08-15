import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { AuthenticatedUser } from "@pos-erp-v2/shared";
import { UsersRepository } from "./users.repository.js";
import {
  generateTemporaryPassword,
  hashPassword,
  verifyPassword,
} from "../common/utils/password.util.js";
import type { UpdateMeDto } from "./dto/update-me.dto.js";
import type { ChangeMyPasswordDto } from "./dto/change-my-password.dto.js";
import type { SetMyPinDto } from "./dto/set-my-pin.dto.js";
import type { CreateUserDto } from "./dto/create-user.dto.js";

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async getMe(userId: string): Promise<AuthenticatedUser> {
    const user = await this.usersRepository.findAuthenticatedUserById(userId);
    if (!user) {
      throw new NotFoundException("Utilisateur introuvable");
    }
    return user;
  }

  async updateMe(
    userId: string,
    input: UpdateMeDto,
  ): Promise<AuthenticatedUser> {
    if (
      input.email &&
      (await this.usersRepository.emailExists(input.email, userId))
    ) {
      throw new ConflictException("Un compte existe déjà avec cet email");
    }
    return this.usersRepository.updateProfile(userId, input);
  }

  // Exige le mot de passe actuel (l'utilisateur est déjà authentifié) —
  // contrairement à /auth/reset-password, prévu pour un compte inaccessible.
  async changeMyPassword(
    userId: string,
    input: ChangeMyPasswordDto,
  ): Promise<void> {
    const user = await this.usersRepository.findUserById(userId);
    if (!user) {
      throw new NotFoundException("Utilisateur introuvable");
    }
    const valid = await verifyPassword(
      input.currentPassword,
      user.passwordHash,
    );
    if (!valid) {
      throw new BadRequestException("Mot de passe actuel incorrect");
    }
    const passwordHash = await hashPassword(input.newPassword);
    await Promise.all([
      this.usersRepository.updateUserPasswordHash(userId, passwordHash),
      this.usersRepository.revokeAllUserRefreshTokens(userId),
    ]);
  }

  async setMyPin(userId: string, input: SetMyPinDto): Promise<void> {
    const pinCodeHash = await hashPassword(input.pinCode);
    await this.usersRepository.updatePinCodeHash(userId, pinCodeHash);
  }

  async createUser(
    input: CreateUserDto,
  ): Promise<{ user: AuthenticatedUser; temporaryPassword: string }> {
    if (Boolean(input.roleId) !== Boolean(input.establishmentId)) {
      throw new BadRequestException(
        "roleId et establishmentId doivent être fournis ensemble",
      );
    }
    if (await this.usersRepository.emailExists(input.email)) {
      throw new ConflictException("Un compte existe déjà avec cet email");
    }

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await hashPassword(temporaryPassword);
    const user = await this.usersRepository.createUser({
      ...input,
      passwordHash,
    });

    return { user, temporaryPassword };
  }
}
