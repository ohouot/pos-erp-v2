import { IsString, MinLength } from "class-validator";

export class VerifyPinDto {
  @IsString()
  @MinLength(1, { message: "Approbateur requis" })
  userId!: string;

  @IsString()
  @MinLength(1, { message: "Code requis" })
  pinCode!: string;

  @IsString()
  @MinLength(1, { message: "Permission requise" })
  permission!: string;
}
