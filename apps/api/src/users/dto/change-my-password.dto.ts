import { IsString, Matches, MinLength } from "class-validator";

export class ChangeMyPasswordDto {
  @IsString()
  @MinLength(1)
  currentPassword!: string;

  @IsString()
  @MinLength(8, { message: "8 caractères minimum" })
  @Matches(/[A-Z]/, { message: "Au moins une majuscule" })
  @Matches(/[0-9]/, { message: "Au moins un chiffre" })
  newPassword!: string;
}
