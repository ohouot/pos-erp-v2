import { Controller, Get, Query, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { ReportsService } from "./reports.service.js";
import { exportFinancialSummaryToCsv } from "./reports.csv.js";
import { EstablishmentGuard } from "../common/guards/establishment.guard.js";
import { CurrentEstablishmentId } from "../common/decorators/current-establishment-id.decorator.js";
import { RequirePermission } from "../common/decorators/require-permission.decorator.js";
import { DailyReportQueryDto } from "./dto/daily-report-query.dto.js";
import { DashboardQueryDto } from "./dto/dashboard-query.dto.js";
import { FinancialSummaryQueryDto } from "./dto/financial-summary-query.dto.js";

@Controller("reports")
@UseGuards(EstablishmentGuard)
@RequirePermission("reports:read")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get("daily")
  async daily(
    @CurrentEstablishmentId() establishmentId: string,
    @Query() query: DailyReportQueryDto,
  ) {
    return {
      summary: await this.reportsService.getDailyReport(establishmentId, query),
    };
  }

  @Get("dashboard")
  async dashboard(
    @CurrentEstablishmentId() establishmentId: string,
    @Query() query: DashboardQueryDto,
  ) {
    return {
      summary: await this.reportsService.getDashboard(establishmentId, query),
    };
  }

  @Get("financial-summary")
  async financialSummary(
    @CurrentEstablishmentId() establishmentId: string,
    @Query() query: FinancialSummaryQueryDto,
  ) {
    return {
      summary: await this.reportsService.getFinancialSummary(
        establishmentId,
        query,
      ),
    };
  }

  @Get("financial-summary/export")
  @RequirePermission("reports:export")
  async exportFinancialSummary(
    @CurrentEstablishmentId() establishmentId: string,
    @Query() query: FinancialSummaryQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const summary = await this.reportsService.getFinancialSummary(
      establishmentId,
      query,
    );
    const csv = exportFinancialSummaryToCsv(summary);
    res.set({
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="rapport-financier.csv"',
    });
    return csv;
  }
}
