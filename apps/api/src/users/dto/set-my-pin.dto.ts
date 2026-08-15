import { Matches } from "class-validator";

export class SetMyPinDto {
  @Matches(/^[0-9]{4,6}$/, { message: "4 à 6 chiffres" })
  pinCode!: string;
}
