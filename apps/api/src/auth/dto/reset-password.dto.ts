import { IsString, Matches, MinLength } from "class-validator";

export class ResetPasswordDto {
  @IsString()
  @MinLength(1, { message: "Token requis" })
  token!: string;

  @IsString()
  @MinLength(8, { message: "8 caractères minimum" })
  @Matches(/[A-Z]/, { message: "Au moins une majuscule" })
  @Matches(/[0-9]/, { message: "Au moins un chiffre" })
  password!: string;
}
