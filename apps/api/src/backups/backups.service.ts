import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { BackupsS3Service } from "./backups.s3.service.js";
import { PgDumpService } from "./pg-dump.service.js";

const PREFIX = "backups/";
// "backup-AAAAMMJJ-HHMMSS.dump" uniquement — le nom de fichier vient du
// client sur les routes download/restore/delete, jamais interpolé sans
// validation stricte dans une clé de stockage (traversal de chemin).
const FILENAME_PATTERN = /^backup-\d{8}-\d{6}\.dump$/;

export interface BackupFile {
  filename: string;
  size: number;
  createdAt: Date;
}

function assertValidFilename(filename: string): void {
  if (!FILENAME_PATTERN.test(filename)) {
    throw new BadRequestException("Nom de fichier de sauvegarde invalide");
  }
}

function generateFilename(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  return `backup-${stamp}.dump`;
}

@Injectable()
export class BackupsService {
  private readonly logger = new Logger(BackupsService.name);

  constructor(
    private readonly s3: BackupsS3Service,
    private readonly pgDump: PgDumpService,
    private readonly config: ConfigService,
  ) {}

  async listBackups(): Promise<BackupFile[]> {
    const objects = await this.s3.list(PREFIX);
    return objects
      .map((obj) => ({
        filename: obj.key.slice(PREFIX.length),
        size: obj.size,
        createdAt: obj.lastModified,
      }))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Purge les sauvegardes les plus anciennes au-delà du nombre à conserver —
  // appelée après CHAQUE sauvegarde (planifiée ou manuelle) pour éviter une
  // croissance non bornée du stockage. Le projet de référence ne l'appelait
  // qu'après une sauvegarde planifiée (jamais après une création manuelle
  // via POST /backups) — un manque assumé ici, corrigé plutôt que reproduit.
  async pruneOldBackups(): Promise<void> {
    const retentionCount =
      this.config.get<number>("BACKUP_RETENTION_COUNT") ?? 7;
    const files = await this.listBackups();
    const toDelete = files.slice(retentionCount);
    for (const file of toDelete) {
      await this.s3.delete(PREFIX + file.filename);
      this.logger.log(`Sauvegarde expirée supprimée : ${file.filename}`);
    }
  }

  async createBackup(): Promise<BackupFile> {
    const filename = generateFilename();
    const dump = await this.pgDump.runDump();
    await this.s3.put(PREFIX + filename, dump);
    await this.pruneOldBackups();
    return { filename, size: dump.byteLength, createdAt: new Date() };
  }

  private async assertBackupExists(filename: string): Promise<void> {
    assertValidFilename(filename);
    const exists = await this.s3.exists(PREFIX + filename);
    if (!exists) throw new NotFoundException("Sauvegarde introuvable");
  }

  async getBackupBuffer(filename: string): Promise<Buffer> {
    await this.assertBackupExists(filename);
    return this.s3.getBuffer(PREFIX + filename);
  }

  async deleteBackup(filename: string): Promise<void> {
    await this.assertBackupExists(filename);
    await this.s3.delete(PREFIX + filename);
  }

  async restoreBackup(filename: string): Promise<void> {
    await this.assertBackupExists(filename);
    const dump = await this.s3.getBuffer(PREFIX + filename);
    await this.pgDump.runRestore(dump);
  }
}
