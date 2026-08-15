import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Queue, Worker, type Job } from "bullmq";
import { BackupsService } from "./backups.service.js";

const QUEUE_NAME = "backups-scheduled";
const REPEATABLE_JOB_ID = "scheduled-backup";

// BullMQ + Redis remplace le `setInterval` en mémoire du projet de référence
// — un job répétable persiste sa planification côté Redis (survit à un
// redémarrage/redéploiement de l'API), contrairement à un minuteur en
// mémoire process qui repart de zéro à chaque démarrage.
@Injectable()
export class BackupsScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BackupsScheduler.name);
  private queue: Queue | null = null;
  private worker: Worker | null = null;

  constructor(
    private readonly backupsService: BackupsService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const scheduleHours =
      this.config.get<number>("BACKUP_SCHEDULE_HOURS") ?? 24;
    if (scheduleHours <= 0) {
      this.logger.log(
        "Sauvegarde planifiée désactivée (BACKUP_SCHEDULE_HOURS=0)",
      );
      return;
    }

    const connection = {
      url: this.config.get<string>("REDIS_URL") ?? "redis://localhost:6380",
    };
    this.queue = new Queue(QUEUE_NAME, { connection });
    await this.queue.upsertJobScheduler(
      REPEATABLE_JOB_ID,
      { every: scheduleHours * 60 * 60 * 1000 },
      { name: REPEATABLE_JOB_ID },
    );

    this.worker = new Worker(
      QUEUE_NAME,
      async (_job: Job) => {
        const backup = await this.backupsService.createBackup();
        this.logger.log(`Sauvegarde planifiée effectuée : ${backup.filename}`);
      },
      { connection },
    );
    this.worker.on("failed", (_job, error) => {
      this.logger.error("Échec de la sauvegarde planifiée", error);
    });

    this.logger.log(
      `Sauvegarde planifiée activée : toutes les ${scheduleHours}h`,
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    await this.queue?.close();
  }
}
