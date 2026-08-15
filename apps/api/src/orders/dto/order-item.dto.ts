import {
  IsIn,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  MinLength,
} from "class-validator";

export class OrderItemInputDto {
  @IsString()
  @MinLength(1, { message: "Produit requis" })
  productId!: string;

  @IsPositive({ message: "Doit être supérieur à 0" })
  quantity!: number;

  @IsOptional()
  @IsIn([1, 2, 3])
  priceTier?: 1 | 2 | 3 = 1;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number = 0;

  @IsOptional()
  @IsString()
  discountId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
