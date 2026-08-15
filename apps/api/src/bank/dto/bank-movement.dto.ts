import { IsOptional, IsPositive, IsString } from "class-validator";

export class BankMovementDto {
  @IsPositive({ message: "Doit être supérieur à 0" })
  amount!: number;

  @IsOptional()
  @IsString()
  reason?: string;
}
