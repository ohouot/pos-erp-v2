import { IsOptional, IsString } from "class-validator";

export class AttendanceActionDto {
  @IsOptional()
  @IsString()
  notes?: string;
}
