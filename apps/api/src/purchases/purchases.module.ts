import { Module } from "@nestjs/common";
import { PurchasesController } from "./purchases.controller.js";
import { PurchasesService } from "./purchases.service.js";
import { PurchasesRepository } from "./purchases.repository.js";
import { StockModule } from "../stock/stock.module.js";

@Module({
  imports: [StockModule],
  controllers: [PurchasesController],
  providers: [PurchasesService, PurchasesRepository],
})
export class PurchasesModule {}
