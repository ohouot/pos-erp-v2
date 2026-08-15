import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";

// `code` est un identifiant stable (détection des paiements espèces à la
// clôture de caisse, rapports) — jamais modifiable après création,
// volontairement absent de ce DTO.
export class UpdatePaymentMethodDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  label?: string;

  @IsOptional()
  @IsInt()
  displayOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
