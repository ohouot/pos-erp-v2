import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsPositive,
  IsString,
  MinLength,
  ValidateNested,
} from "class-validator";

export class RecipeIngredientDto {
  @IsString()
  @MinLength(1, { message: "Produit ingrédient requis" })
  ingredientProductId!: string;

  @IsString()
  @MinLength(1, { message: "Unité requise" })
  unitId!: string;

  @IsPositive({ message: "Doit être supérieur à 0" })
  quantity!: number;
}

export class UpsertRecipeDto {
  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ArrayMinSize(1, { message: "Au moins un ingrédient requis" })
  @ValidateNested({ each: true })
  @Type(() => RecipeIngredientDto)
  ingredients!: RecipeIngredientDto[];
}
