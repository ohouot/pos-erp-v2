import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ExpenseCategoriesRepository } from "./expense-categories.repository.js";
import type { ExpenseCategoryDto } from "./dto/expense-category.dto.js";

@Injectable()
export class ExpenseCategoriesService {
  constructor(
    private readonly expenseCategoriesRepository: ExpenseCategoriesRepository,
  ) {}

  list(establishmentId: string) {
    return this.expenseCategoriesRepository.findAllForEstablishment(
      establishmentId,
    );
  }

  private async assertNameAvailable(
    establishmentId: string,
    name: string,
    excludeId?: string,
  ) {
    const existing = await this.expenseCategoriesRepository.findByName(
      establishmentId,
      name,
    );
    if (existing && existing.id !== excludeId) {
      throw new ConflictException("Une catégorie avec ce nom existe déjà");
    }
  }

  async create(establishmentId: string, input: ExpenseCategoryDto) {
    await this.assertNameAvailable(establishmentId, input.name);
    return this.expenseCategoriesRepository.create(establishmentId, input.name);
  }

  private async findOrThrow(establishmentId: string, id: string) {
    const category = await this.expenseCategoriesRepository.findById(
      establishmentId,
      id,
    );
    if (!category) throw new NotFoundException("Catégorie introuvable");
    return category;
  }

  get(establishmentId: string, id: string) {
    return this.findOrThrow(establishmentId, id);
  }

  async update(establishmentId: string, id: string, input: ExpenseCategoryDto) {
    await this.findOrThrow(establishmentId, id);
    await this.assertNameAvailable(establishmentId, input.name, id);
    return this.expenseCategoriesRepository.update(id, input.name);
  }

  async remove(establishmentId: string, id: string) {
    await this.findOrThrow(establishmentId, id);
    const count = await this.expenseCategoriesRepository.countExpenses(id);
    if (count > 0) {
      throw new BadRequestException(
        "Cette catégorie contient des dépenses — impossible de la supprimer",
      );
    }
    await this.expenseCategoriesRepository.remove(id);
  }
}
