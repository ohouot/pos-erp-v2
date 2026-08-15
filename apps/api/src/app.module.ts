import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { PrismaModule } from "./prisma/prisma.module.js";
import { HealthModule } from "./health/health.module.js";
import { AuditModule } from "./audit/audit.module.js";
import { MailModule } from "./mail/mail.module.js";
import { UsersModule } from "./users/users.module.js";
import { RolesModule } from "./roles/roles.module.js";
import { EstablishmentsModule } from "./establishments/establishments.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { CategoriesModule } from "./categories/categories.module.js";
import { UnitsModule } from "./units/units.module.js";
import { LocationsModule } from "./locations/locations.module.js";
import { SuppliersModule } from "./suppliers/suppliers.module.js";
import { ProductsModule } from "./products/products.module.js";
import { RecipesModule } from "./recipes/recipes.module.js";
import { StockModule } from "./stock/stock.module.js";
import { InventoryModule } from "./inventory/inventory.module.js";
import { PurchasesModule } from "./purchases/purchases.module.js";
import { TablesModule } from "./tables/tables.module.js";
import { OrdersModule } from "./orders/orders.module.js";
import { PaymentMethodsModule } from "./payment-methods/payment-methods.module.js";
import { CashierModule } from "./cashier/cashier.module.js";
import { PaymentsModule } from "./payments/payments.module.js";
import { BankModule } from "./bank/bank.module.js";
import { CustomersModule } from "./customers/customers.module.js";
import { DiscountsModule } from "./discounts/discounts.module.js";
import { ReservationsModule } from "./reservations/reservations.module.js";
import { ExpenseCategoriesModule } from "./expense-categories/expense-categories.module.js";
import { ExpensesModule } from "./expenses/expenses.module.js";
import { EmployeesModule } from "./employees/employees.module.js";
import { WorkShiftsModule } from "./work-shifts/work-shifts.module.js";
import { AttendanceModule } from "./attendance/attendance.module.js";
import { RealtimeModule } from "./realtime/realtime.module.js";
import { NotificationsModule } from "./notifications/notifications.module.js";
import { ReportsModule } from "./reports/reports.module.js";
import { BackupsModule } from "./backups/backups.module.js";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard.js";
import { PermissionsGuard } from "./common/guards/permissions.guard.js";
import { validateEnv } from "./config/env.validation.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    // Fenêtre par défaut équivalente à l'ancien apiRateLimiter (100 req /
    // 60s / IP) ; les routes d'authentification sensibles resserrent cette
    // limite via @Throttle() (voir AuthController).
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>("JWT_ACCESS_SECRET"),
        signOptions: {
          expiresIn: config.get<string>("JWT_ACCESS_EXPIRES_IN") ?? "15m",
        },
      }),
    }),
    PrismaModule,
    AuditModule,
    MailModule,
    HealthModule,
    UsersModule,
    RolesModule,
    EstablishmentsModule,
    AuthModule,
    CategoriesModule,
    UnitsModule,
    LocationsModule,
    SuppliersModule,
    StockModule,
    ProductsModule,
    RecipesModule,
    InventoryModule,
    PurchasesModule,
    TablesModule,
    OrdersModule,
    PaymentMethodsModule,
    CashierModule,
    PaymentsModule,
    BankModule,
    CustomersModule,
    DiscountsModule,
    ReservationsModule,
    ExpenseCategoriesModule,
    ExpensesModule,
    EmployeesModule,
    WorkShiftsModule,
    AttendanceModule,
    RealtimeModule,
    NotificationsModule,
    ReportsModule,
    BackupsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
