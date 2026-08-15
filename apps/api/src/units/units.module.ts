import { Module } from "@nestjs/common";
import { UnitsController } from "./units.controller.js";
import { UnitsService } from "./units.service.js";
import { UnitsRepository } from "./units.repository.js";

@Module({
  controllers: [UnitsController],
  providers: [UnitsService, UnitsRepository],
  exports: [UnitsRepository],
})
export class UnitsModule {}
