import {
  IsDateString,
  IsOptional,
  IsPositive,
  IsString,
  MinLength,
} from "class-validator";

export class CreateExpenseDto {
  @IsString()
  @MinLength(1, { message: "Catégorie requise" })
  categoryId!: string;

  @IsPositive({ message: "Doit être supérieur à 0" })
  amount!: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  expenseDate?: string;

  @IsOptional()
  @IsString()
  receiptUrl?: string;
}
