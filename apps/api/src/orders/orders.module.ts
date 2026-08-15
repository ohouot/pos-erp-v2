import { Module } from "@nestjs/common";
import { OrdersController } from "./orders.controller.js";
import { OrdersService } from "./orders.service.js";
import { OrdersRepository } from "./orders.repository.js";
import { TablesModule } from "../tables/tables.module.js";
import { ProductsModule } from "../products/products.module.js";
import { StockModule } from "../stock/stock.module.js";
import { NotificationsModule } from "../notifications/notifications.module.js";

@Module({
  imports: [TablesModule, ProductsModule, StockModule, NotificationsModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersRepository],
  exports: [OrdersRepository],
})
export class OrdersModule {}
