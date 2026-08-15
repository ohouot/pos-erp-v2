import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { OrdersService } from "./orders.service.js";
import { AuditService } from "../audit/audit.service.js";
import { EstablishmentGuard } from "../common/guards/establishment.guard.js";
import { CurrentEstablishmentId } from "../common/decorators/current-establishment-id.decorator.js";
import { CurrentUser } from "../common/decorators/current-user.decorator.js";
import { RequirePermission } from "../common/decorators/require-permission.decorator.js";
import type { AuthenticatedUser } from "@pos-erp-v2/shared";
import { CreateOrderDto } from "./dto/create-order.dto.js";
import { UpdateOrderDto } from "./dto/update-order.dto.js";
import { OrderItemInputDto } from "./dto/order-item.dto.js";
import { UpdateOrderItemDto } from "./dto/update-order-item.dto.js";
import { ApplyGlobalDiscountDto } from "./dto/apply-global-discount.dto.js";
import { ListOrdersQueryDto } from "./dto/list-orders-query.dto.js";

@Controller("orders")
@UseGuards(EstablishmentGuard)
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  async list(
    @CurrentEstablishmentId() establishmentId: string,
    @Query() query: ListOrdersQueryDto,
  ) {
    const { items, meta } = await this.ordersService.list(establishmentId, {
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
      status: query.status,
      paidStatus: query.paidStatus,
    });
    return { orders: items, meta };
  }

  @Post()
  @RequirePermission("orders:create")
  async create(
    @CurrentEstablishmentId() establishmentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateOrderDto,
  ) {
    return {
      order: await this.ordersService.createOrder(
        establishmentId,
        user.id,
        body,
      ),
    };
  }

  @Get(":id")
  async get(
    @CurrentEstablishmentId() establishmentId: string,
    @Param("id") id: string,
  ) {
    return { order: await this.ordersService.get(establishmentId, id) };
  }

  @Patch(":id")
  @RequirePermission("orders:update")
  async update(
    @CurrentEstablishmentId() establishmentId: string,
    @Param("id") id: string,
    @Body() body: UpdateOrderDto,
  ) {
    return {
      order: await this.ordersService.update(establishmentId, id, body),
    };
  }

  @Patch(":id/discount")
  @RequirePermission("orders:update")
  async applyDiscount(
    @CurrentEstablishmentId() establishmentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() body: ApplyGlobalDiscountDto,
  ) {
    const order = await this.ordersService.applyGlobalDiscount(
      establishmentId,
      id,
      body,
    );
    this.auditService.record({
      establishmentId,
      userId: user.id,
      action: "ORDER_GLOBAL_DISCOUNT_APPLIED",
      entityType: "Order",
      entityId: id,
    });
    return { order };
  }

  @Post(":id/items")
  @RequirePermission("orders:create")
  async addItem(
    @CurrentEstablishmentId() establishmentId: string,
    @Param("id") id: string,
    @Body() body: OrderItemInputDto,
  ) {
    return {
      item: await this.ordersService.addItem(establishmentId, id, body),
    };
  }

  @Patch(":id/items/:itemId")
  @RequirePermission("orders:update")
  async updateItem(
    @CurrentEstablishmentId() establishmentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Param("itemId") itemId: string,
    @Body() body: UpdateOrderItemDto,
  ) {
    const item = await this.ordersService.updateItem(
      establishmentId,
      id,
      itemId,
      body,
    );
    this.auditService.record({
      establishmentId,
      userId: user.id,
      action: "ORDER_ITEM_UPDATED",
      entityType: "Order",
      entityId: id,
    });
    return { item };
  }

  @Delete(":id/items/:itemId")
  @RequirePermission("orders:update")
  async removeItem(
    @CurrentEstablishmentId() establishmentId: string,
    @Param("id") id: string,
    @Param("itemId") itemId: string,
  ) {
    await this.ordersService.removeItem(establishmentId, id, itemId);
  }

  @Post(":id/send-to-kitchen")
  @RequirePermission("orders:update")
  async sendToKitchen(
    @CurrentEstablishmentId() establishmentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    const { order } = await this.ordersService.sendToKitchen(
      establishmentId,
      id,
      user.id,
    );
    return { order };
  }

  @Post(":id/mark-served")
  @RequirePermission("orders:update")
  async markServed(
    @CurrentEstablishmentId() establishmentId: string,
    @Param("id") id: string,
  ) {
    return { order: await this.ordersService.markServed(establishmentId, id) };
  }

  @Post(":id/cancel")
  @RequirePermission("orders:cancel")
  async cancel(
    @CurrentEstablishmentId() establishmentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    const order = await this.ordersService.cancelOrder(establishmentId, id);
    this.auditService.record({
      establishmentId,
      userId: user.id,
      action: "ORDER_CANCELLED",
      entityType: "Order",
      entityId: id,
    });
    return { order };
  }
}
