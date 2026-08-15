import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { RecipesRepository } from "./recipes.repository.js";
import { ProductsRepository } from "../products/products.repository.js";
import type { UpsertRecipeDto } from "./dto/upsert-recipe.dto.js";

@Injectable()
export class RecipesService {
  constructor(
    private readonly recipesRepository: RecipesRepository,
    private readonly productsRepository: ProductsRepository,
  ) {}

  async get(establishmentId: string, productId: string) {
    await this.assertProductExists(establishmentId, productId);
    return this.recipesRepository.findByProductId(productId);
  }

  private async assertProductExists(
    establishmentId: string,
    productId: string,
  ) {
    const product = await this.productsRepository.findById(
      establishmentId,
      productId,
    );
    if (!product) throw new NotFoundException("Produit introuvable");
    return product;
  }

  // Pas de BOM récursive : un ingrédient qui est lui-même composé
  // (isComposed) est rejeté — même règle que le projet de référence.
  private async validateIngredients(
    establishmentId: string,
    productId: string,
    ingredients: UpsertRecipeDto["ingredients"],
  ) {
    const seen = new Set<string>();
    for (const ingredient of ingredients) {
      if (ingredient.ingredientProductId === productId) {
        throw new BadRequestException(
          "Un produit ne peut pas être son propre ingrédient",
        );
      }
      if (seen.has(ingredient.ingredientProductId)) {
        throw new BadRequestException(
          "Un ingrédient ne peut pas apparaître deux fois",
        );
      }
      seen.add(ingredient.ingredientProductId);

      const ingredientProduct = await this.productsRepository.findById(
        establishmentId,
        ingredient.ingredientProductId,
      );
      if (!ingredientProduct) {
        throw new BadRequestException("Produit ingrédient introuvable");
      }
      if (ingredientProduct.isComposed) {
        throw new BadRequestException(
          `"${ingredientProduct.name}" est lui-même un produit composé — pas de recette imbriquée`,
        );
      }
    }
  }

  async upsert(
    establishmentId: string,
    productId: string,
    input: UpsertRecipeDto,
  ) {
    await this.assertProductExists(establishmentId, productId);
    await this.validateIngredients(
      establishmentId,
      productId,
      input.ingredients,
    );
    return this.recipesRepository.upsert(
      productId,
      input.notes,
      input.ingredients,
    );
  }

  async remove(establishmentId: string, productId: string) {
    await this.assertProductExists(establishmentId, productId);
    await this.recipesRepository.remove(productId);
  }
}
