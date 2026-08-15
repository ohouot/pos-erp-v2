import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { PaymentMethodsService } from "./payment-methods.service.js";
import { EstablishmentGuard } from "../common/guards/establishment.guard.js";
import { CurrentEstablishmentId } from "../common/decorators/current-establishment-id.decorator.js";
import { RequirePermission } from "../common/decorators/require-permission.decorator.js";
import { CreatePaymentMethodDto } from "./dto/create-payment-method.dto.js";
import { UpdatePaymentMethodDto } from "./dto/update-payment-method.dto.js";

@Controller("payment-methods")
@UseGuards(EstablishmentGuard)
@RequirePermission("paymentMethods:read")
export class PaymentMethodsController {
  constructor(private readonly paymentMethodsService: PaymentMethodsService) {}

  @Get()
  async list(
    @CurrentEstablishmentId() establishmentId: string,
    @Query("active") active?: string,
  ) {
    return {
      paymentMethods: await this.paymentMethodsService.list(
        establishmentId,
        active === "true",
      ),
    };
  }

  @Get(":id")
  async get(
    @CurrentEstablishmentId() establishmentId: string,
    @Param("id") id: string,
  ) {
    return {
      paymentMethod: await this.paymentMethodsService.get(establishmentId, id),
    };
  }

  @Post()
  @RequirePermission("paymentMethods:create")
  async create(
    @CurrentEstablishmentId() establishmentId: string,
    @Body() body: CreatePaymentMethodDto,
  ) {
    return {
      paymentMethod: await this.paymentMethodsService.create(
        establishmentId,
        body,
      ),
    };
  }

  @Patch(":id")
  @RequirePermission("paymentMethods:update")
  async update(
    @CurrentEstablishmentId() establishmentId: string,
    @Param("id") id: string,
    @Body() body: UpdatePaymentMethodDto,
  ) {
    return {
      paymentMethod: await this.paymentMethodsService.update(
        establishmentId,
        id,
        body,
      ),
    };
  }

  @Delete(":id")
  @RequirePermission("paymentMethods:delete")
  @HttpCode(204)
  async remove(
    @CurrentEstablishmentId() establishmentId: string,
    @Param("id") id: string,
  ) {
    await this.paymentMethodsService.remove(establishmentId, id);
  }
}
