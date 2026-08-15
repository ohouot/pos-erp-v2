import { Module } from "@nestjs/common";
import { ExpenseCategoriesController } from "./expense-categories.controller.js";
import { ExpenseCategoriesService } from "./expense-categories.service.js";
import { ExpenseCategoriesRepository } from "./expense-categories.repository.js";

@Module({
  controllers: [ExpenseCategoriesController],
  providers: [ExpenseCategoriesService, ExpenseCategoriesRepository],
  exports: [ExpenseCategoriesRepository],
})
export class ExpenseCategoriesModule {}
