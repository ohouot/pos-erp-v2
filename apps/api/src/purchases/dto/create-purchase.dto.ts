import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from "class-validator";
import { PurchaseItemDto } from "./purchase-item.dto.js";

// totalAmount n'est jamais reçu du client : recalculé côté serveur à partir
// des lignes (voir PurchasesRepository.computeTotalAmount).
export class CreatePurchaseDto {
  @IsString()
  @MinLength(1, { message: "Fournisseur requis" })
  supplierId!: string;

  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @IsOptional()
  @IsDateString()
  purchaseDate?: string;

  @IsOptional()
  @IsString()
  observation?: string;

  @IsArray()
  @ArrayMinSize(1, { message: "Au moins un article requis" })
  @ValidateNested({ each: true })
  @Type(() => PurchaseItemDto)
  items!: PurchaseItemDto[];
}
