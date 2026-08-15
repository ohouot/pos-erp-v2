import {
  IsDateString,
  IsIn,
  IsOptional,
  IsPositive,
  IsString,
  MinLength,
} from "class-validator";
import { DISCOUNT_TYPES, type DiscountType } from "@pos-erp-v2/shared";

// Le plafond de 100% pour un type PERCENTAGE est vérifié en service
// (DiscountsService), pas ici : class-validator ne permet pas facilement
// une contrainte conditionnelle sur un autre champ du même objet sans
// désactiver aussi les validateurs inconditionnels de ce champ.
export class CreateDiscountDto {
  @IsString()
  @MinLength(1, { message: "Nom requis" })
  name!: string;

  @IsIn(DISCOUNT_TYPES)
  type!: DiscountType;

  @IsPositive({ message: "Doit être supérieur à 0" })
  value!: number;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
