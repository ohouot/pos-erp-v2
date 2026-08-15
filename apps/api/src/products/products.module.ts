import { Module } from "@nestjs/common";
import { ProductsController } from "./products.controller.js";
import { ProductsService } from "./products.service.js";
import { ProductsRepository } from "./products.repository.js";
import { ProductsCsvService } from "./products.csv.service.js";
import { CategoriesModule } from "../categories/categories.module.js";
import { StockModule } from "../stock/stock.module.js";

@Module({
  imports: [CategoriesModule, StockModule],
  controllers: [ProductsController],
  providers: [ProductsService, ProductsRepository, ProductsCsvService],
  exports: [ProductsRepository],
})
export class ProductsModule {}
