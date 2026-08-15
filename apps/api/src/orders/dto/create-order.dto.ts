import { Type } from "class-transformer";
import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { ORDER_TYPES, type OrderType } from "@pos-erp-v2/shared";
import { OrderItemInputDto } from "./order-item.dto.js";

export class CreateOrderDto {
  @IsOptional()
  @IsIn(ORDER_TYPES)
  orderType?: OrderType = "DINE_IN";

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tableIds?: string[] = [];

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  administratorId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemInputDto)
  items?: OrderItemInputDto[] = [];

  // Rejeu idempotent d'une synchronisation hors ligne (voir OrdersService.createOrder).
  @IsOptional()
  @IsString()
  clientTicketId?: string;
}
