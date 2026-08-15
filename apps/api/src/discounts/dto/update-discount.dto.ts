import { IsBoolean, IsOptional } from "class-validator";
import { PartialType } from "@nestjs/mapped-types";
import { CreateDiscountDto } from "./create-discount.dto.js";

export class UpdateDiscountDto extends PartialType(CreateDiscountDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
