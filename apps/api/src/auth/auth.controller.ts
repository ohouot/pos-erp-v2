import {
  Body,
  Controller,
  Get,
  HttpCode,
  Ip,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Throttle } from "@nestjs/throttler";
import type { Request, Response } from "express";
import { AuthService } from "./auth.service.js";
import { AuditService } from "../audit/audit.service.js";
import { Public } from "../common/decorators/public.decorator.js";
import { CurrentEstablishmentId } from "../common/decorators/current-establishment-id.decorator.js";
import { EstablishmentGuard } from "../common/guards/establishment.guard.js";
import {
  REFRESH_TOKEN_COOKIE,
  clearRefreshTokenCookie,
  setRefreshTokenCookie,
} from "../common/utils/cookie.util.js";
import { LoginDto } from "./dto/login.dto.js";
import { RegisterDto } from "./dto/register.dto.js";
import { VerifyEmailDto } from "./dto/verify-email.dto.js";
import { RequestPasswordResetDto } from "./dto/request-password-reset.dto.js";
import { ResetPasswordDto } from "./dto/reset-password.dto.js";
import { VerifyPinDto } from "./dto/verify-pin.dto.js";
import { ListApproversQueryDto } from "./dto/list-approvers-query.dto.js";

// Tentatives de connexion/inscription : fenêtre dédiée plus stricte que le
// throttler par défaut de l'API — même valeurs que l'ancien
// middlewares/rateLimit.middleware.ts (authRateLimiter).
const AUTH_THROTTLE = { default: { limit: 10, ttl: 900_000 } };

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly auditService: AuditService,
    private readonly config: ConfigService,
  ) {}

  private isProduction(): boolean {
    return this.config.get<string>("NODE_ENV") === "production";
  }

  private setCookie(res: Response, refreshToken: string): void {
    setRefreshTokenCookie(
      res,
      refreshToken,
      this.config.get<string>("JWT_REFRESH_EXPIRES_IN") ?? "7d",
      this.isProduction(),
    );
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post("login")
  @HttpCode(200)
  async login(
    @Body() body: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
  ) {
    const { user, accessToken, refreshToken } = await this.authService.login({
      ...body,
      ip,
    });
    this.setCookie(res, refreshToken);
    this.auditService.record({
      userId: user.id,
      action: "LOGIN_SUCCESS",
      entityType: "User",
      entityId: user.id,
      ipAddress: ip,
      userAgent: req.headers["user-agent"],
    });
    return { user, accessToken };
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post("register")
  async register(
    @Body() body: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
  ) {
    const { user, accessToken, refreshToken } = await this.authService.register(
      {
        ...body,
        ip,
      },
    );
    this.setCookie(res, refreshToken);
    this.auditService.record({
      establishmentId: user.establishments[0]?.establishmentId,
      userId: user.id,
      action: "ACCOUNT_REGISTERED",
      entityType: "User",
      entityId: user.id,
      ipAddress: ip,
      userAgent: req.headers["user-agent"],
    });
    res.status(201);
    return { user, accessToken };
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post("verify-email")
  async verifyEmail(@Body() body: VerifyEmailDto) {
    await this.authService.verifyEmail(body);
    return { message: "Adresse email confirmée avec succès." };
  }

  @Public()
  @Post("refresh")
  @HttpCode(200)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
  ) {
    const token = req.cookies?.[REFRESH_TOKEN_COOKIE] as string | undefined;
    if (!token) {
      throw new UnauthorizedException(
        "Session expirée, veuillez vous reconnecter",
      );
    }

    const { user, accessToken, refreshToken } = await this.authService.refresh({
      refreshToken: token,
      ip,
    });
    this.setCookie(res, refreshToken);
    return { user, accessToken };
  }

  @Public()
  @Post("logout")
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.[REFRESH_TOKEN_COOKIE] as string | undefined;
    await this.authService.logout({ refreshToken: token });
    clearRefreshTokenCookie(res, this.isProduction());
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post("forgot-password")
  @HttpCode(200)
  async forgotPassword(@Body() body: RequestPasswordResetDto) {
    await this.authService.requestPasswordReset(body);
    return {
      message:
        "Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.",
    };
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post("reset-password")
  @HttpCode(200)
  async resetPassword(@Body() body: ResetPasswordDto) {
    await this.authService.resetPassword(body);
    return { message: "Mot de passe mis à jour avec succès." };
  }

  @UseGuards(EstablishmentGuard)
  @Get("eligible-approvers")
  async listEligibleApprovers(
    @CurrentEstablishmentId() establishmentId: string,
    @Query() query: ListApproversQueryDto,
  ) {
    const approvers = await this.authService.listEligibleApprovers(
      establishmentId,
      query.permission,
    );
    return { approvers };
  }

  @UseGuards(EstablishmentGuard)
  @Post("verify-pin")
  async verifyPin(
    @CurrentEstablishmentId() establishmentId: string,
    @Body() body: VerifyPinDto,
    @Req() req: Request,
    @Ip() ip: string,
  ) {
    const result = await this.authService.verifyPin(establishmentId, body);
    this.auditService.record({
      establishmentId,
      userId: result.approverId,
      action: "MANAGER_OVERRIDE_APPROVED",
      entityType: "User",
      entityId: result.approverId,
      newValue: { permission: body.permission },
      ipAddress: ip,
      userAgent: req.headers["user-agent"],
    });
    return result;
  }
}
