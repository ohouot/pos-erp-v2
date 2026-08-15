import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { EstablishmentType } from "@pos-erp-v2/shared";
import { AuthRepository } from "./auth.repository.js";
import { UsersRepository } from "../users/users.repository.js";
import { MailService } from "../mail/mail.service.js";
import { hashPassword, verifyPassword } from "../common/utils/password.util.js";
import { generateOpaqueToken, hashToken } from "../common/utils/token.util.js";
import { parseDurationMs } from "../common/utils/duration.util.js";
import type { LoginResult } from "./auth.types.js";

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1h
// Plus généreux que le reset de mot de passe (1h) : une confirmation de
// création de compte n'a pas la même urgence sécuritaire, et ne bloque de
// toute façon jamais l'usage du compte (voir User.emailVerifiedAt).
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24h

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly config: ConfigService,
  ) {}

  private refreshTokenTtlMs(): number {
    return parseDurationMs(
      this.config.get<string>("JWT_REFRESH_EXPIRES_IN") ?? "7d",
    );
  }

  private async issueSession(
    userId: string,
    ip?: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = this.jwtService.sign({ sub: userId });
    const refreshToken = generateOpaqueToken();

    await this.authRepository.createRefreshToken({
      userId,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + this.refreshTokenTtlMs()),
      createdByIp: ip,
    });

    return { accessToken, refreshToken };
  }

  async login(input: {
    email: string;
    password: string;
    ip?: string;
  }): Promise<LoginResult> {
    const invalidCredentials = () =>
      new UnauthorizedException("Email ou mot de passe incorrect");

    const userRow = await this.usersRepository.findUserByEmail(input.email);
    if (!userRow || !userRow.isActive) {
      throw invalidCredentials();
    }

    const passwordValid = await verifyPassword(
      input.password,
      userRow.passwordHash,
    );
    if (!passwordValid) {
      throw invalidCredentials();
    }

    const [{ accessToken, refreshToken }] = await Promise.all([
      this.issueSession(userRow.id, input.ip),
      this.usersRepository.updateLastLoginAt(userRow.id),
    ]);

    const user = await this.usersRepository.findAuthenticatedUserById(
      userRow.id,
    );
    if (!user) {
      throw invalidCredentials();
    }

    return { user, accessToken, refreshToken };
  }

  // Contrairement à requestPasswordReset (qui ne révèle jamais si un email
  // existe déjà, car il porte sur le compte de quelqu'un d'autre), une
  // inscription publique doit dire clairement à l'utilisateur que SON email
  // est déjà pris — c'est son propre compte, pas une cible d'énumération.
  async register(input: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    password: string;
    establishmentName: string;
    establishmentType: EstablishmentType;
    ip?: string;
  }): Promise<LoginResult> {
    if (await this.usersRepository.emailExists(input.email)) {
      throw new ConflictException("Cet email est déjà utilisé");
    }

    const passwordHash = await hashPassword(input.password);
    const { user: userRow } = await this.authRepository.registerAccount({
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      passwordHash,
      establishmentName: input.establishmentName,
      establishmentType: input.establishmentType,
    });

    const [{ accessToken, refreshToken }] = await Promise.all([
      this.issueSession(userRow.id, input.ip),
      this.sendEmailVerification(userRow.id, userRow.email),
    ]);

    const user = await this.usersRepository.findAuthenticatedUserById(
      userRow.id,
    );
    if (!user) {
      throw new BadRequestException("Échec de la création du compte");
    }

    return { user, accessToken, refreshToken };
  }

  private async sendEmailVerification(
    userId: string,
    email: string,
  ): Promise<void> {
    const verificationToken = generateOpaqueToken();
    await this.authRepository.createEmailVerificationToken({
      userId,
      tokenHash: hashToken(verificationToken),
      expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
    });

    const clientUrl = this.config.get<string>("CLIENT_URL");
    const verifyLink = `${clientUrl}/verify-email?token=${verificationToken}`;
    if (this.mailService.isEnabled) {
      await this.mailService.send({
        to: email,
        subject: "Confirme ton adresse email",
        html: `<p>Bienvenue ! Confirme ton adresse email pour finaliser ton inscription.</p><p><a href="${verifyLink}">Confirmer mon email</a></p><p>Ce lien expire dans 24 heures. Ton compte est déjà utilisable sans attendre cette confirmation.</p>`,
      });
    }
  }

  async verifyEmail(input: { token: string }): Promise<void> {
    const tokenHash = hashToken(input.token);
    const record =
      await this.authRepository.findValidEmailVerificationTokenByHash(
        tokenHash,
      );
    if (!record) {
      throw new BadRequestException("Lien de confirmation invalide ou expiré");
    }

    await Promise.all([
      this.usersRepository.markUserEmailVerified(record.userId),
      this.authRepository.markEmailVerificationTokenUsed(record.id),
    ]);
  }

  async refresh(input: {
    refreshToken: string;
    ip?: string;
  }): Promise<LoginResult> {
    const sessionExpired = () =>
      new UnauthorizedException("Session expirée, veuillez vous reconnecter");

    const tokenHash = hashToken(input.refreshToken);
    const existing =
      await this.authRepository.findValidRefreshTokenByHash(tokenHash);
    if (!existing) {
      throw sessionExpired();
    }

    const { accessToken, refreshToken } = await this.issueSession(
      existing.userId,
      input.ip,
    );
    await this.authRepository.revokeRefreshToken(
      existing.id,
      hashToken(refreshToken),
    );

    const user = await this.usersRepository.findAuthenticatedUserById(
      existing.userId,
    );
    if (!user) {
      throw sessionExpired();
    }

    return { user, accessToken, refreshToken };
  }

  async logout(input: { refreshToken?: string }): Promise<void> {
    if (!input.refreshToken) return;
    const tokenHash = hashToken(input.refreshToken);
    const existing =
      await this.authRepository.findValidRefreshTokenByHash(tokenHash);
    if (existing) {
      await this.authRepository.revokeRefreshToken(existing.id);
    }
  }

  // Ne révèle jamais si l'email existe ou non (anti-énumération de comptes).
  async requestPasswordReset(input: { email: string }): Promise<void> {
    const userRow = await this.usersRepository.findUserByEmail(input.email);
    if (!userRow || !userRow.isActive) return;

    const resetToken = generateOpaqueToken();
    await this.authRepository.createPasswordResetToken({
      userId: userRow.id,
      tokenHash: hashToken(resetToken),
      expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
    });

    const clientUrl = this.config.get<string>("CLIENT_URL");
    const resetLink = `${clientUrl}/reset-password?token=${resetToken}`;
    if (this.mailService.isEnabled) {
      await this.mailService.send({
        to: userRow.email,
        subject: "Réinitialisation de votre mot de passe",
        html: `<p>Une réinitialisation de mot de passe a été demandée pour ce compte.</p><p><a href="${resetLink}">Réinitialiser mon mot de passe</a></p><p>Ce lien expire dans 1 heure. Si tu n'es pas à l'origine de cette demande, ignore cet email.</p>`,
      });
    }
  }

  async resetPassword(input: {
    token: string;
    password: string;
  }): Promise<void> {
    const tokenHash = hashToken(input.token);
    const resetRecord =
      await this.authRepository.findValidPasswordResetTokenByHash(tokenHash);
    if (!resetRecord) {
      throw new BadRequestException(
        "Lien de réinitialisation invalide ou expiré",
      );
    }

    const passwordHash = await hashPassword(input.password);
    await Promise.all([
      this.usersRepository.updateUserPasswordHash(
        resetRecord.userId,
        passwordHash,
      ),
      this.authRepository.markPasswordResetTokenUsed(resetRecord.id),
      this.usersRepository.revokeAllUserRefreshTokens(resetRecord.userId),
    ]);
  }

  async listEligibleApprovers(
    establishmentId: string,
    permission: string,
  ): Promise<Array<{ id: string; name: string }>> {
    const members = await this.authRepository.findMembersWithPermission(
      establishmentId,
      permission,
    );
    return members.map((member) => ({
      id: member.user.id,
      name: `${member.user.firstName} ${member.user.lastName}`,
    }));
  }

  // Confirmation d'identité pour une action sensible — pas un contournement
  // de permission : l'appelant garde besoin de son propre droit RBAC pour
  // l'action elle-même, ce PIN ne fait qu'attribuer/journaliser qui a
  // validé. Message d'erreur volontairement générique.
  async verifyPin(
    establishmentId: string,
    input: { userId: string; pinCode: string; permission: string },
  ): Promise<{ approverId: string; approverName: string }> {
    const members = await this.authRepository.findMembersWithPermission(
      establishmentId,
      input.permission,
    );
    const member = members.find((m) => m.user.id === input.userId);
    const valid =
      member?.user.pinCodeHash &&
      (await verifyPassword(input.pinCode, member.user.pinCodeHash));
    if (!member || !valid) {
      throw new BadRequestException("Code invalide");
    }
    return {
      approverId: member.user.id,
      approverName: `${member.user.firstName} ${member.user.lastName}`,
    };
  }
}
