import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CategoriesRepository } from "./categories.repository.js";
import type { CreateCategoryDto } from "./dto/create-category.dto.js";
import type { UpdateCategoryDto } from "./dto/update-category.dto.js";

@Injectable()
export class CategoriesService {
  constructor(private readonly categoriesRepository: CategoriesRepository) {}

  list(establishmentId: string) {
    return this.categoriesRepository.findAllForEstablishment(establishmentId);
  }

  create(establishmentId: string, input: CreateCategoryDto) {
    return this.categoriesRepository.create(establishmentId, input);
  }

  private async findOrThrow(establishmentId: string, id: string) {
    const category = await this.categoriesRepository.findById(
      establishmentId,
      id,
    );
    if (!category) throw new NotFoundException("Catégorie introuvable");
    return category;
  }

  async update(establishmentId: string, id: string, input: UpdateCategoryDto) {
    await this.findOrThrow(establishmentId, id);
    if (input.parentId) {
      if (input.parentId === id) {
        throw new BadRequestException(
          "Une catégorie ne peut pas être son propre parent",
        );
      }
      await this.findOrThrow(establishmentId, input.parentId);
    }
    return this.categoriesRepository.update(id, input);
  }

  async remove(establishmentId: string, id: string) {
    await this.findOrThrow(establishmentId, id);
    await this.categoriesRepository.softDelete(id);
  }
}
