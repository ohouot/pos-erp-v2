import {
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  MinLength,
} from "class-validator";

export class PurchaseItemDto {
  @IsString()
  @MinLength(1, { message: "Produit requis" })
  productId!: string;

  @IsString()
  @MinLength(1, { message: "Unité requise" })
  unitId!: string;

  @IsPositive({ message: "Doit être supérieur à 0" })
  quantity!: number;

  @IsNumber()
  @Min(0)
  purchasePrice!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  suggestedSalePrice?: number;
}
