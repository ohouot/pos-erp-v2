import { IsIn, IsPositive, IsString, MinLength } from "class-validator";

export class AdjustStockDto {
  @IsString()
  @MinLength(1, { message: "Produit requis" })
  productId!: string;

  @IsIn(["ADJUSTMENT_IN", "ADJUSTMENT_OUT"])
  type!: "ADJUSTMENT_IN" | "ADJUSTMENT_OUT";

  @IsPositive({ message: "Doit être supérieur à 0" })
  quantity!: number;

  @IsString()
  @MinLength(1, { message: "Motif requis" })
  reason!: string;
}
