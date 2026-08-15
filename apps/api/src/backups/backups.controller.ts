import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  StreamableFile,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { BackupsService } from "./backups.service.js";
import { SuperAdminGuard } from "../common/guards/super-admin.guard.js";
import { CurrentUser } from "../common/decorators/current-user.decorator.js";
import { AuditService } from "../audit/audit.service.js";
import type { AuthenticatedUser } from "@pos-erp-v2/shared";

const HEAVY_OPERATION_THROTTLE = { default: { limit: 3, ttl: 600_000 } };

// Pas de EstablishmentGuard : une sauvegarde couvre toute la base, tous
// établissements confondus — hors du modèle multi-tenant habituel, réservée
// au Super Administrateur (contrôle binaire, hors du système RBAC).
@Controller("backups")
@UseGuards(SuperAdminGuard)
export class BackupsController {
  constructor(
    private readonly backupsService: BackupsService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  async list() {
    return { backups: await this.backupsService.listBackups() };
  }

  @Post()
  @Throttle(HEAVY_OPERATION_THROTTLE)
  async create(@CurrentUser() user: AuthenticatedUser) {
    const backup = await this.backupsService.createBackup();
    this.auditService.record({
      userId: user.id,
      action: "BACKUP_CREATED",
      entityType: "Backup",
      entityId: backup.filename,
    });
    return { backup };
  }

  @Get(":filename/download")
  async download(@Param("filename") filename: string): Promise<StreamableFile> {
    const buffer = await this.backupsService.getBackupBuffer(filename);
    // Un Buffer brut renvoyé via @Res({ passthrough: true }) est
    // JSON-sérialisé par Nest (`{"type":"Buffer","data":[...]}`, via
    // Buffer.prototype.toJSON) au lieu d'être envoyé en binaire tel quel —
    // StreamableFile est le mécanisme officiel Nest pour un contenu binaire.
    return new StreamableFile(buffer, {
      type: "application/octet-stream",
      disposition: `attachment; filename="${filename}"`,
    });
  }

  @Post(":filename/restore")
  @Throttle(HEAVY_OPERATION_THROTTLE)
  @HttpCode(204)
  async restore(
    @Param("filename") filename: string,
    @Body() body: { confirm?: boolean },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (body.confirm !== true) {
      throw new BadRequestException(
        "Confirmation requise : cette action remplace intégralement la base de données actuelle",
      );
    }
    await this.backupsService.restoreBackup(filename);
    this.auditService.record({
      userId: user.id,
      action: "BACKUP_RESTORED",
      entityType: "Backup",
      entityId: filename,
    });
  }

  @Delete(":filename")
  @HttpCode(204)
  async remove(
    @Param("filename") filename: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.backupsService.deleteBackup(filename);
    this.auditService.record({
      userId: user.id,
      action: "BACKUP_DELETED",
      entityType: "Backup",
      entityId: filename,
    });
  }
}
