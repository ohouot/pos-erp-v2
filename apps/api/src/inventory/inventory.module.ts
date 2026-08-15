import { Module } from "@nestjs/common";
import { InventoryController } from "./inventory.controller.js";
import { InventoryService } from "./inventory.service.js";
import { InventoryRepository } from "./inventory.repository.js";
import { StockModule } from "../stock/stock.module.js";

@Module({
  imports: [StockModule],
  controllers: [InventoryController],
  providers: [InventoryService, InventoryRepository],
})
export class InventoryModule {}
