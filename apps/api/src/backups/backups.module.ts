import { Module } from "@nestjs/common";
import { BackupsController } from "./backups.controller.js";
import { BackupsService } from "./backups.service.js";
import { BackupsS3Service } from "./backups.s3.service.js";
import { PgDumpService } from "./pg-dump.service.js";
import { BackupsScheduler } from "./backups.scheduler.js";

@Module({
  controllers: [BackupsController],
  providers: [
    BackupsService,
    BackupsS3Service,
    PgDumpService,
    BackupsScheduler,
  ],
})
export class BackupsModule {}
