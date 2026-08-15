import { IsOptional, IsString } from "class-validator";

export class UpdateOrderDto {
  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  administratorId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
