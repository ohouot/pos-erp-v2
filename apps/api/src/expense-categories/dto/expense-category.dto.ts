import { IsString, MinLength } from "class-validator";

export class ExpenseCategoryDto {
  @IsString()
  @MinLength(1, { message: "Nom requis" })
  name!: string;
}
