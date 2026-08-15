import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { EmployeesService } from "./employees.service.js";
import { EmployeesCsvService } from "./employees.csv.service.js";
import { AuditService } from "../audit/audit.service.js";
import { EstablishmentGuard } from "../common/guards/establishment.guard.js";
import { CurrentEstablishmentId } from "../common/decorators/current-establishment-id.decorator.js";
import { CurrentUser } from "../common/decorators/current-user.decorator.js";
import { RequirePermission } from "../common/decorators/require-permission.decorator.js";
import type { AuthenticatedUser } from "@pos-erp-v2/shared";
import { CreateEmployeeDto } from "./dto/create-employee.dto.js";
import { UpdateEmployeeDto } from "./dto/update-employee.dto.js";

@Controller("employees")
@UseGuards(EstablishmentGuard)
export class EmployeesController {
  constructor(
    private readonly employeesService: EmployeesService,
    private readonly employeesCsvService: EmployeesCsvService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  @RequirePermission("employees:read")
  async list(@CurrentEstablishmentId() establishmentId: string) {
    return { employees: await this.employeesService.list(establishmentId) };
  }

  @Get("export")
  @RequirePermission("employees:read")
  async exportCsv(
    @CurrentEstablishmentId() establishmentId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const csv = await this.employeesCsvService.exportToCsv(establishmentId);
    res.set({
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="employes.csv"',
    });
    return csv;
  }

  @Post("import")
  @RequirePermission("employees:create")
  @HttpCode(200)
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!file.originalname.toLowerCase().endsWith(".csv")) {
          cb(
            new BadRequestException("Le fichier doit être au format .csv"),
            false,
          );
          return;
        }
        cb(null, true);
      },
    }),
  )
  async importCsv(
    @CurrentEstablishmentId() establishmentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException("Fichier requis");
    const result = await this.employeesCsvService.importFromCsv(
      establishmentId,
      file.buffer,
    );
    this.auditService.record({
      establishmentId,
      userId: user.id,
      action: "EMPLOYEE_IMPORTED",
      entityType: "Employee",
    });
    return result;
  }

  @Get(":id")
  @RequirePermission("employees:read")
  async get(
    @CurrentEstablishmentId() establishmentId: string,
    @Param("id") id: string,
  ) {
    return { employee: await this.employeesService.get(establishmentId, id) };
  }

  @Post()
  @RequirePermission("employees:create")
  async create(
    @CurrentEstablishmentId() establishmentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateEmployeeDto,
  ) {
    const result = await this.employeesService.create(establishmentId, body);
    this.auditService.record({
      establishmentId,
      userId: user.id,
      action: "EMPLOYEE_CREATED",
      entityType: "Employee",
      entityId: result.employee.id,
    });
    return result;
  }

  @Patch(":id")
  @RequirePermission("employees:update")
  async update(
    @CurrentEstablishmentId() establishmentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() body: UpdateEmployeeDto,
  ) {
    const employee = await this.employeesService.update(
      establishmentId,
      id,
      body,
    );
    this.auditService.record({
      establishmentId,
      userId: user.id,
      action: "EMPLOYEE_UPDATED",
      entityType: "Employee",
      entityId: id,
    });
    return { employee };
  }
}
