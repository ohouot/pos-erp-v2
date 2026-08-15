import { IsOptional, IsString, MinLength } from "class-validator";

export class CreateBankAccountDto {
  @IsString()
  @MinLength(1, { message: "Nom requis" })
  name!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
