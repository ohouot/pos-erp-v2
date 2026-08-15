import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Min } from "class-validator";
import { PURCHASE_STATUSES, type PurchaseStatus } from "@pos-erp-v2/shared";

export class ListPurchasesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number = 20;

  @IsOptional()
  @IsIn(PURCHASE_STATUSES)
  status?: PurchaseStatus;

  @IsOptional()
  @IsString()
  supplierId?: string;
}
