import {
  IsDateString,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
} from "class-validator";

export class CreateReservationDto {
  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  tableId?: string;

  @IsDateString()
  startTime!: string;

  @IsOptional()
  @IsDateString()
  endTime?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  partySize?: number = 1;

  @IsOptional()
  @IsString()
  notes?: string;
}
