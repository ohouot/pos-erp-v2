import { Module } from "@nestjs/common";
import { StockController } from "./stock.controller.js";
import { StockRepository } from "./stock.repository.js";
import { StockDeductionService } from "./stock-deduction.service.js";
import { StockIncrementService } from "./stock-increment.service.js";
import { StockMovementsService } from "./stock-movements.service.js";
import { StockAlertsService } from "./stock-alerts.service.js";
import { NotificationsModule } from "../notifications/notifications.module.js";

@Module({
  imports: [NotificationsModule],
  controllers: [StockController],
  providers: [
    StockRepository,
    StockDeductionService,
    StockIncrementService,
    StockMovementsService,
    StockAlertsService,
  ],
  exports: [
    StockRepository,
    StockDeductionService,
    StockIncrementService,
    StockMovementsService,
    StockAlertsService,
  ],
})
export class StockModule {}
