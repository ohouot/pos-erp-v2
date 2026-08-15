import { Module } from "@nestjs/common";
import { CashierController } from "./cashier.controller.js";
import { CashierService } from "./cashier.service.js";
import { CashierRepository } from "./cashier.repository.js";

@Module({
  controllers: [CashierController],
  providers: [CashierService, CashierRepository],
  exports: [CashierRepository],
})
export class CashierModule {}
