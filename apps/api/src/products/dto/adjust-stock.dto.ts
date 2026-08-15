import { IsNumber, IsOptional, IsString, Min } from "class-validator";

export class AdjustStockDto {
  @IsNumber()
  @Min(0)
  targetQuantity!: number;

  @IsOptional()
  @IsString()
  reason?: string;
}
