import {
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MinLength,
} from "class-validator";

export class CreateCategoryDto {
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
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: "Couleur hex invalide" })
  color?: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}
