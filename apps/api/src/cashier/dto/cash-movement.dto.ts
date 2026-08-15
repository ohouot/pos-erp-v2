import { IsOptional, IsPositive, IsString } from "class-validator";

// Le sens (dépôt/retrait) est déterminé par la route appelée, pas par un
// champ ici — permet un contrôle de permission distinct par sens
// (cashier:deposit / cashier:withdraw).
export class CashMovementDto {
  @IsPositive({ message: "Doit être supérieur à 0" })
  amount!: number;

  @IsOptional()
  @IsString()
  reason?: string;
}
