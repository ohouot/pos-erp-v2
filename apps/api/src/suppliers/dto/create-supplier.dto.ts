import { IsEmail, IsOptional, IsString, MinLength } from "class-validator";

export class CreateSupplierDto {
  @IsString()
  @MinLength(1, { message: "Nom requis" })
  name!: string;

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail({}, { message: "Email invalide" })
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
