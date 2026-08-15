import { Module } from "@nestjs/common";
import { RecipesController } from "./recipes.controller.js";
import { RecipesService } from "./recipes.service.js";
import { RecipesRepository } from "./recipes.repository.js";
import { ProductsModule } from "../products/products.module.js";

@Module({
  imports: [ProductsModule],
  controllers: [RecipesController],
  providers: [RecipesService, RecipesRepository],
})
export class RecipesModule {}
