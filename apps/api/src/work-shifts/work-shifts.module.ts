import { Module } from "@nestjs/common";
import { WorkShiftsController } from "./work-shifts.controller.js";
import { WorkShiftsService } from "./work-shifts.service.js";
import { WorkShiftsRepository } from "./work-shifts.repository.js";
import { EmployeesModule } from "../employees/employees.module.js";

@Module({
  imports: [EmployeesModule],
  controllers: [WorkShiftsController],
  providers: [WorkShiftsService, WorkShiftsRepository],
})
export class WorkShiftsModule {}
