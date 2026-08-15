import {
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from "class-validator";

export class RecordItemDto {
  @IsString()
  @MinLength(1, { message: "Produit requis" })
  productId!: string;

  @IsNumber()
  @Min(0)
  realQuantity!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
