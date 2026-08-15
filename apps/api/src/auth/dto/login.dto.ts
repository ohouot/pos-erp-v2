import { IsEmail, IsString, MinLength } from "class-validator";

export class LoginDto {
  @IsEmail({}, { message: "Email invalide" })
  email!: string;

  @IsString()
  @MinLength(8, { message: "8 caractères minimum" })
  password!: string;
}
