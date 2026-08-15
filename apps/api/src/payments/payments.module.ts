import { Module } from "@nestjs/common";
import { PaymentsController } from "./payments.controller.js";
import { PaymentsService } from "./payments.service.js";
import { PaymentsRepository } from "./payments.repository.js";
import { OrdersModule } from "../orders/orders.module.js";
import { CashierModule } from "../cashier/cashier.module.js";
import { PaymentMethodsModule } from "../payment-methods/payment-methods.module.js";
import { TablesModule } from "../tables/tables.module.js";
import { CustomersModule } from "../customers/customers.module.js";

@Module({
  imports: [
    OrdersModule,
    CashierModule,
    PaymentMethodsModule,
    TablesModule,
    CustomersModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentsRepository],
})
export class PaymentsModule {}
