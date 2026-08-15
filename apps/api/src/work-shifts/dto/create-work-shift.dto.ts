import { IsDateString, IsOptional, IsString, MinLength } from "class-validator";

// `employeeId` désigne ici l'identifiant du compte utilisateur (User.id),
// pas celui de la fiche employé (Employee.id = UserEstablishment.id) — même
// convention que le projet de référence (WorkShift.employeeId pointe
// directement vers User, voir Employee.userId côté /employees pour la
// valeur à passer ici). La validation endTime > startTime se fait en
// service (pas exprimable proprement en class-validator sans désactiver
// aussi les validateurs inconditionnels du champ, cf. Discounts au Lot 7).
export class CreateWorkShiftDto {
  @IsString()
  @MinLength(1, { message: "Employé requis" })
  employeeId!: string;

  @IsDateString()
  startTime!: string;

  @IsDateString()
  endTime!: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
