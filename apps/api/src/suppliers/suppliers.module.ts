import { Module } from "@nestjs/common";
import { SuppliersController } from "./suppliers.controller.js";
import { SuppliersService } from "./suppliers.service.js";
import { SuppliersRepository } from "./suppliers.repository.js";

@Module({
  controllers: [SuppliersController],
  providers: [SuppliersService, SuppliersRepository],
  exports: [SuppliersRepository],
})
export class SuppliersModule {}
