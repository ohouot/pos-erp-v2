import {
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from "class-validator";

export class UpdateOrderItemDto {
  @IsOptional()
  @IsPositive({ message: "Doit être supérieur à 0" })
  quantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @IsOptional()
  @IsString()
  discountId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
