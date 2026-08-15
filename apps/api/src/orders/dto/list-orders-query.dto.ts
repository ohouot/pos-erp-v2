import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, Min } from "class-validator";
import {
  ORDER_STATUSES,
  ORDER_PAID_STATUS_GROUPS,
  type OrderStatus,
  type OrderPaidStatusGroup,
} from "@pos-erp-v2/shared";

export class ListOrdersQueryDto {
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
  @IsIn(ORDER_STATUSES)
  status?: OrderStatus;

  // Vue simplifiée en 3 niveaux (UNPAID/PAID/CANCELLED) — prioritaire sur
  // `status` quand les deux sont fournis (voir OrdersRepository.findAllPaginated).
  @IsOptional()
  @IsIn(ORDER_PAID_STATUS_GROUPS)
  paidStatus?: OrderPaidStatusGroup;
}
