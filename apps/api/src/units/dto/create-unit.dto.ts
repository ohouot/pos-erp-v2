import { IsString, MinLength } from "class-validator";

export class CreateUnitDto {
  @IsString()
  @MinLength(1, { message: "Nom requis" })
  name!: string;

  @IsString()
  @MinLength(1, { message: "Symbole requis" })
  symbol!: string;
}
