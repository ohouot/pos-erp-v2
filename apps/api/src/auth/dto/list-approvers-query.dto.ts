import { IsString, MinLength } from "class-validator";

export class ListApproversQueryDto {
  @IsString()
  @MinLength(1, { message: "Permission requise" })
  permission!: string;
}
