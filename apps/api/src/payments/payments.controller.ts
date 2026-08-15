import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { PaymentsService } from "./payments.service.js";
import { AuditService } from "../audit/audit.service.js";
import { EstablishmentGuard } from "../common/guards/establishment.guard.js";
import { CurrentEstablishmentId } from "../common/decorators/current-establishment-id.decorator.js";
import { CurrentUser } from "../common/decorators/current-user.decorator.js";
import { RequirePermission } from "../common/decorators/require-permission.decorator.js";
import type { AuthenticatedUser } from "@pos-erp-v2/shared";
import { CreatePaymentDto } from "./dto/create-payment.dto.js";

@Controller("orders/:orderId/payments")
@UseGuards(EstablishmentGuard)
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  @RequirePermission("payments:read")
  async list(
    @CurrentEstablishmentId() establishmentId: string,
    @Param("orderId") orderId: string,
  ) {
    return {
      payments: await this.paymentsService.listForOrder(
        establishmentId,
        orderId,
      ),
    };
  }

  @Post()
  @RequirePermission("payments:create")
  async create(
    @CurrentEstablishmentId() establishmentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("orderId") orderId: string,
    @Body() body: CreatePaymentDto,
  ) {
    const order = await this.paymentsService.createPayment(
      establishmentId,
      orderId,
      user.id,
      body,
    );
    this.auditService.record({
      establishmentId,
      userId: user.id,
      action: "PAYMENT_CREATED",
      entityType: "Order",
      entityId: orderId,
    });
    return { order };
  }
}
