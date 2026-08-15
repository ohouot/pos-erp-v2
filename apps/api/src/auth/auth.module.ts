import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { AuthRepository } from "./auth.repository.js";
import { UsersModule } from "../users/users.module.js";
import { EstablishmentsModule } from "../establishments/establishments.module.js";

@Module({
  imports: [UsersModule, EstablishmentsModule],
  controllers: [AuthController],
  providers: [AuthService, AuthRepository],
})
export class AuthModule {}
