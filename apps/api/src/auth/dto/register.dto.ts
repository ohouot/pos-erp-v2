import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from "class-validator";
import {
  ESTABLISHMENT_TYPES,
  type EstablishmentType,
} from "@pos-erp-v2/shared";

// Auto-inscription publique : crée à la fois le compte (propriétaire) et son
// premier établissement en un seul geste — voir AuthService.register. Le
// compte obtient automatiquement le rôle système "Administrateur" (tous
// droits sauf suppression de l'établissement) sur cet établissement.
export class RegisterDto {
  @IsString()
  @MinLength(1, { message: "Prénom requis" })
  firstName!: string;

  @IsString()
  @MinLength(1, { message: "Nom requis" })
  lastName!: string;

  @IsEmail({}, { message: "Email invalide" })
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  @MinLength(8, { message: "8 caractères minimum" })
  @Matches(/[A-Z]/, { message: "Au moins une majuscule" })
  @Matches(/[0-9]/, { message: "Au moins un chiffre" })
  password!: string;

  @IsString()
  @MinLength(1, { message: "Nom de l'établissement requis" })
  establishmentName!: string;

  @IsEnum(ESTABLISHMENT_TYPES)
  establishmentType!: EstablishmentType;
}
