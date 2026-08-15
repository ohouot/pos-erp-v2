import { IsOptional, IsString } from "class-validator";

export class StartSessionDto {
  @IsOptional()
  @IsString()
  notes?: string;
}
