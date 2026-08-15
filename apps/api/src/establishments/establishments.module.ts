import { Module } from "@nestjs/common";
import { EstablishmentsController } from "./establishments.controller.js";
import { EstablishmentsService } from "./establishments.service.js";
import { EstablishmentsRepository } from "./establishments.repository.js";

@Module({
  controllers: [EstablishmentsController],
  providers: [EstablishmentsService, EstablishmentsRepository],
  exports: [EstablishmentsRepository],
})
export class EstablishmentsModule {}
