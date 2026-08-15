import { Module } from "@nestjs/common";
import { PaymentMethodsController } from "./payment-methods.controller.js";
import { PaymentMethodsService } from "./payment-methods.service.js";
import { PaymentMethodsRepository } from "./payment-methods.repository.js";

@Module({
  controllers: [PaymentMethodsController],
  providers: [PaymentMethodsService, PaymentMethodsRepository],
  exports: [PaymentMethodsRepository],
})
export class PaymentMethodsModule {}
