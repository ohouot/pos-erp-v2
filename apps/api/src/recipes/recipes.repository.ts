import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

export interface RecipeIngredientInput {
  ingredientProductId: string;
  unitId: string;
  quantity: number;
}

const recipeInclude = {
  ingredients: { include: { ingredientProduct: true, unit: true } },
} as const;

@Injectable()
export class RecipesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByProductId(productId: string) {
    return this.prisma.recipe.findUnique({
      where: { productId },
      include: recipeInclude,
    });
  }

  // Remplace intégralement les ingrédients (delete + recreate), même
  // logique que packagingUnits côté produit — un upsert Recipe (notes) +
  // isComposed=true sur le produit, dans une seule transaction.
  async upsert(
    productId: string,
    notes: string | undefined,
    ingredients: RecipeIngredientInput[],
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: productId },
        data: { isComposed: true },
      });

      const recipe = await tx.recipe.upsert({
        where: { productId },
        create: { productId, notes },
        update: { notes },
      });

      await tx.recipeIngredient.deleteMany({ where: { recipeId: recipe.id } });
      await tx.recipeIngredient.createMany({
        data: ingredients.map((i) => ({
          recipeId: recipe.id,
          ingredientProductId: i.ingredientProductId,
          unitId: i.unitId,
          quantity: i.quantity,
        })),
      });

      return tx.recipe.findUniqueOrThrow({
        where: { id: recipe.id },
        include: recipeInclude,
      });
    });
  }

  async remove(productId: string) {
    await this.prisma.$transaction(async (tx) => {
      await tx.recipe.delete({ where: { productId } });
      await tx.product.update({
        where: { id: productId },
        data: { isComposed: false },
      });
    });
  }
}
