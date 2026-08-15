import { Module } from "@nestjs/common";
import { EmployeesController } from "./employees.controller.js";
import { EmployeesService } from "./employees.service.js";
import { EmployeesRepository } from "./employees.repository.js";
import { EmployeesCsvService } from "./employees.csv.service.js";
import { RolesModule } from "../roles/roles.module.js";

@Module({
  imports: [RolesModule],
  controllers: [EmployeesController],
  providers: [EmployeesService, EmployeesRepository, EmployeesCsvService],
  exports: [EmployeesRepository],
})
export class EmployeesModule {}
