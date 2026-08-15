import {
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  MinLength,
} from "class-validator";
import {
  ESTABLISHMENT_TYPES,
  type EstablishmentType,
} from "@pos-erp-v2/shared";

export class CreateEstablishmentDto {
  @IsString()
  @MinLength(1, { message: "Nom requis" })
  name!: string;

  @IsEnum(ESTABLISHMENT_TYPES)
  type!: EstablishmentType;

  @IsOptional()
  @IsUrl({}, { message: "URL invalide" })
  logoUrl?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  currency?: string = "XOF";

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  taxRate?: number = 0;

  @IsOptional()
  @IsString()
  language?: string = "fr";

  @IsOptional()
  @IsString()
  timezone?: string = "Africa/Abidjan";
}
