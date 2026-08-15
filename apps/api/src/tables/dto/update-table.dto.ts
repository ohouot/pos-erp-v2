import { IsIn, IsOptional } from "class-validator";
import { PartialType } from "@nestjs/mapped-types";
import { TABLE_STATUSES, type TableStatus } from "@pos-erp-v2/shared";
import { CreateTableDto } from "./create-table.dto.js";

export class UpdateTableDto extends PartialType(CreateTableDto) {
  @IsOptional()
  @IsIn(TABLE_STATUSES)
  status?: TableStatus;
}
