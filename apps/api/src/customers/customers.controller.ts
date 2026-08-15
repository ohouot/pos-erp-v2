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
import { CustomersService } from "./customers.service.js";
import { EstablishmentGuard } from "../common/guards/establishment.guard.js";
import { CurrentEstablishmentId } from "../common/decorators/current-establishment-id.decorator.js";
import { RequirePermission } from "../common/decorators/require-permission.decorator.js";
import { CreateCustomerDto } from "./dto/create-customer.dto.js";
import { UpdateCustomerDto } from "./dto/update-customer.dto.js";
import { ListCustomersQueryDto } from "./dto/list-customers-query.dto.js";

@Controller("customers")
@UseGuards(EstablishmentGuard)
@RequirePermission("customers:read")
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  async list(
    @CurrentEstablishmentId() establishmentId: string,
    @Query() query: ListCustomersQueryDto,
  ) {
    const { items, meta } = await this.customersService.list(establishmentId, {
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
      search: query.search,
    });
    return { customers: items, meta };
  }

  @Get(":id")
  async get(
    @CurrentEstablishmentId() establishmentId: string,
    @Param("id") id: string,
  ) {
    return { customer: await this.customersService.get(establishmentId, id) };
  }

  @Get(":id/orders")
  async orderHistory(
    @CurrentEstablishmentId() establishmentId: string,
    @Param("id") id: string,
  ) {
    return {
      orders: await this.customersService.orderHistory(establishmentId, id),
    };
  }

  @Post()
  @RequirePermission("customers:create")
  async create(
    @CurrentEstablishmentId() establishmentId: string,
    @Body() body: CreateCustomerDto,
  ) {
    return {
      customer: await this.customersService.create(establishmentId, body),
    };
  }

  @Patch(":id")
  @RequirePermission("customers:update")
  async update(
    @CurrentEstablishmentId() establishmentId: string,
    @Param("id") id: string,
    @Body() body: UpdateCustomerDto,
  ) {
    return {
      customer: await this.customersService.update(establishmentId, id, body),
    };
  }

  @Delete(":id")
  @RequirePermission("customers:delete")
  @HttpCode(204)
  async remove(
    @CurrentEstablishmentId() establishmentId: string,
    @Param("id") id: string,
  ) {
    await this.customersService.remove(establishmentId, id);
  }
}
