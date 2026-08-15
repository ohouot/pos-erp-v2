import { IsDateString, IsOptional, IsString } from "class-validator";

export class ListWorkShiftsQueryDto {
  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
