import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from "class-validator";

export class CreatePaymentMethodDto {
  @IsString()
  @Matches(/^[A-Z0-9_]+$/, { message: "Majuscules, chiffres et _ uniquement" })
  code!: string;

  @IsString()
  @MinLength(1, { message: "Nom requis" })
  label!: string;

  @IsOptional()
  @IsInt()
  displayOrder?: number = 0;
}
