import { IsString, MinLength } from "class-validator";

export class CreateLocationDto {
  @IsString()
  @MinLength(1, { message: "Nom requis" })
  name!: string;
}
