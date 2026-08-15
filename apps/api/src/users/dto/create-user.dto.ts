import { IsEmail, IsOptional, IsString, MinLength } from "class-validator";

// roleId/establishmentId : optionnels mais liés (l'un ne va pas sans
// l'autre) — vérifié dans UsersService.createUser, pas ici (règle
// cross-champs, plus lisible en logique métier qu'en décorateur composite).
export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  firstName!: string;

  @IsString()
  @MinLength(1)
  lastName!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  roleId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  establishmentId?: string;
}
