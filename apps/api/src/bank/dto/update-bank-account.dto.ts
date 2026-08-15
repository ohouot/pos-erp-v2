import { IsBoolean, IsOptional } from "class-validator";
import { PartialType } from "@nestjs/mapped-types";
import { CreateBankAccountDto } from "./create-bank-account.dto.js";

export class UpdateBankAccountDto extends PartialType(CreateBankAccountDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
