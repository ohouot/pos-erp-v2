import {
  IsBoolean,
  IsOptional,
  IsPositive,
  IsString,
  MinLength,
} from "class-validator";

export class ProductUnitDto {
  @IsString()
  @MinLength(1, { message: "Unité requise" })
  unitId!: string;

  @IsPositive({ message: "Doit être supérieur à 0" })
  conversionToBase!: number;

  @IsOptional()
  @IsBoolean()
  isPurchaseUnit?: boolean;

  @IsOptional()
  @IsBoolean()
  isSaleUnit?: boolean;

  @IsOptional()
  @IsString()
  barcode?: string;
}
