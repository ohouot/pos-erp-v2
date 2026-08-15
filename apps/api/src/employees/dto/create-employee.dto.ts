import {
  IsDateString,
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from "class-validator";

export class CreateEmployeeDto {
  @IsEmail({}, { message: "Email invalide" })
  email!: string;

  @IsString()
  @MinLength(1, { message: "Prénom requis" })
  firstName!: string;

  @IsString()
  @MinLength(1, { message: "Nom requis" })
  lastName!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  @MinLength(1, { message: "Rôle requis" })
  roleId!: string;

  @IsOptional()
  @IsString()
  vendorCode?: string;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: "Le salaire ne peut pas être négatif" })
  salary?: number;

  @IsOptional()
  @IsDateString()
  hireDate?: string;

  @IsOptional()
  @IsString()
  contractType?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
