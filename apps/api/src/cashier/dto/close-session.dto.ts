import { IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CloseSessionDto {
  @IsNumber()
  @Min(0)
  closingBalanceCounted!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
