import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ExpensesRepository } from "./expenses.repository.js";
import { ExpenseCategoriesRepository } from "../expense-categories/expense-categories.repository.js";
import type { CreateExpenseDto } from "./dto/create-expense.dto.js";
import type { UpdateExpenseDto } from "./dto/update-expense.dto.js";

@Injectable()
export class ExpensesService {
  constructor(
    private readonly expensesRepository: ExpensesRepository,
    private readonly expenseCategoriesRepository: ExpenseCategoriesRepository,
  ) {}

  private async assertCategoryExists(
    establishmentId: string,
    categoryId: string,
  ) {
    const category = await this.expenseCategoriesRepository.findById(
      establishmentId,
      categoryId,
    );
    if (!category)
      throw new BadRequestException("Catégorie de dépense invalide");
  }

  async create(
    establishmentId: string,
    employeeId: string,
    input: CreateExpenseDto,
  ) {
    await this.assertCategoryExists(establishmentId, input.categoryId);
    return this.expensesRepository.create(establishmentId, employeeId, {
      ...input,
      expenseDate: input.expenseDate ? new Date(input.expenseDate) : undefined,
    });
  }

  list(
    establishmentId: string,
    params: {
      page: number;
      pageSize: number;
      categoryId?: string;
      from?: Date;
      to?: Date;
    },
  ) {
    return this.expensesRepository.findAllPaginated(establishmentId, params);
  }

  private async findOrThrow(establishmentId: string, id: string) {
    const expense = await this.expensesRepository.findById(establishmentId, id);
    if (!expense) throw new NotFoundException("Dépense introuvable");
    return expense;
  }

  get(establishmentId: string, id: string) {
    return this.findOrThrow(establishmentId, id);
  }

  async update(establishmentId: string, id: string, input: UpdateExpenseDto) {
    await this.findOrThrow(establishmentId, id);
    if (input.categoryId) {
      await this.assertCategoryExists(establishmentId, input.categoryId);
    }
    return this.expensesRepository.update(id, {
      ...input,
      expenseDate: input.expenseDate ? new Date(input.expenseDate) : undefined,
    });
  }

  async remove(establishmentId: string, id: string) {
    await this.findOrThrow(establishmentId, id);
    await this.expensesRepository.remove(id);
  }
}
