import { IsEmail } from "class-validator";

export class RequestPasswordResetDto {
  @IsEmail({}, { message: "Email invalide" })
  email!: string;
}
