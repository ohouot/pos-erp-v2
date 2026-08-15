import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import { ProductUnitDto } from "./product-unit.dto.js";

export class CreateProductDto {
  @IsString()
  @MinLength(1, { message: "Catégorie requise" })
  categoryId!: string;

  @IsString()
  @MinLength(1, { message: "Nom requis" })
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUrl({}, { message: "URL invalide" })
  imageUrl?: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsString()
  @MinLength(1, { message: "Unité de base requise" })
  baseUnitId!: string;

  @IsNumber()
  @Min(0)
  purchasePrice!: number;

  @IsNumber()
  @Min(0)
  salePrice!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  salePrice2?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  salePrice3?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minSalePrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  taxRate?: number = 0;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minStock?: number = 0;

  @IsOptional()
  @IsDateString()
  expirationDate?: string;

  @IsOptional()
  @IsString()
  locationId?: string;

  @IsOptional()
  @IsString()
  preferredSupplierId?: string;

  @IsOptional()
  @IsBoolean()
  manageStock?: boolean = true;

  @IsOptional()
  @IsBoolean()
  visibleAtPos?: boolean = true;

  @IsOptional()
  @IsBoolean()
  visibleOnPurchaseOrder?: boolean = true;

  @IsOptional()
  @IsBoolean()
  visibleOnlineStore?: boolean = false;

  @IsOptional()
  @IsBoolean()
  isComposed?: boolean = false;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductUnitDto)
  packagingUnits?: ProductUnitDto[] = [];
}
