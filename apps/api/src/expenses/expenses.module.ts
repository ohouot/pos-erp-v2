import { Module } from "@nestjs/common";
import { ExpensesController } from "./expenses.controller.js";
import { ExpensesService } from "./expenses.service.js";
import { ExpensesRepository } from "./expenses.repository.js";
import { ExpenseCategoriesModule } from "../expense-categories/expense-categories.module.js";

@Module({
  imports: [ExpenseCategoriesModule],
  controllers: [ExpensesController],
  providers: [ExpensesService, ExpensesRepository],
})
export class ExpensesModule {}
