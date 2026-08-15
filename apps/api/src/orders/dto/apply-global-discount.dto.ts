import { IsIn, IsNumber, Min } from "class-validator";
import { DISCOUNT_TYPES, type DiscountType } from "@pos-erp-v2/shared";

export class ApplyGlobalDiscountDto {
  @IsIn([...DISCOUNT_TYPES, null])
  type!: DiscountType | null;

  @IsNumber()
  @Min(0)
  value!: number;
}
