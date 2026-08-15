import {
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  MinLength,
} from "class-validator";

// amountReceived n'est utile que pour la méthode de code "CASH" (calcul de
// la monnaie côté serveur) ; ignoré pour les autres modes.
export class CreatePaymentDto {
  @IsString()
  @MinLength(1, { message: "Moyen de paiement requis" })
  paymentMethodId!: string;

  @IsPositive({ message: "Doit être supérieur à 0" })
  amount!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amountReceived?: number;

  @IsOptional()
  @IsString()
  reference?: string;
}
