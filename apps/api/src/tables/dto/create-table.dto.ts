import { IsInt, IsOptional, IsString, MinLength } from "class-validator";

export class CreateTableDto {
  @IsString()
  @MinLength(1, { message: "Nom requis" })
  name!: string;

  @IsOptional()
  @IsInt()
  capacity?: number = 4;

  @IsOptional()
  @IsString()
  zone?: string;

  @IsOptional()
  @IsInt()
  positionX?: number = 0;

  @IsOptional()
  @IsInt()
  positionY?: number = 0;
}
