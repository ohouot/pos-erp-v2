import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { BankService } from "./bank.service.js";
import { EstablishmentGuard } from "../common/guards/establishment.guard.js";
import { CurrentEstablishmentId } from "../common/decorators/current-establishment-id.decorator.js";
import { CurrentUser } from "../common/decorators/current-user.decorator.js";
import { RequirePermission } from "../common/decorators/require-permission.decorator.js";
import type { AuthenticatedUser } from "@pos-erp-v2/shared";
import { CreateBankAccountDto } from "./dto/create-bank-account.dto.js";
import { UpdateBankAccountDto } from "./dto/update-bank-account.dto.js";
import { BankMovementDto } from "./dto/bank-movement.dto.js";

@Controller("bank/accounts")
@UseGuards(EstablishmentGuard)
@RequirePermission("bank:read")
export class BankController {
  constructor(private readonly bankService: BankService) {}

  @Get()
  async list(@CurrentEstablishmentId() establishmentId: string) {
    return { accounts: await this.bankService.list(establishmentId) };
  }

  @Get(":id")
  async get(
    @CurrentEstablishmentId() establishmentId: string,
    @Param("id") id: string,
  ) {
    return { account: await this.bankService.get(establishmentId, id) };
  }

  @Post()
  @RequirePermission("bank:create")
  async create(
    @CurrentEstablishmentId() establishmentId: string,
    @Body() body: CreateBankAccountDto,
  ) {
    return { account: await this.bankService.create(establishmentId, body) };
  }

  @Patch(":id")
  @RequirePermission("bank:update")
  async update(
    @CurrentEstablishmentId() establishmentId: string,
    @Param("id") id: string,
    @Body() body: UpdateBankAccountDto,
  ) {
    return {
      account: await this.bankService.update(establishmentId, id, body),
    };
  }

  @Delete(":id")
  @RequirePermission("bank:update")
  @HttpCode(204)
  async remove(
    @CurrentEstablishmentId() establishmentId: string,
    @Param("id") id: string,
  ) {
    await this.bankService.remove(establishmentId, id);
  }

  @Post(":id/deposit")
  @RequirePermission("bank:deposit")
  async deposit(
    @CurrentEstablishmentId() establishmentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() body: BankMovementDto,
  ) {
    return {
      movement: await this.bankService.deposit(
        establishmentId,
        id,
        user.id,
        body,
      ),
    };
  }

  @Post(":id/withdraw")
  @RequirePermission("bank:withdraw")
  async withdraw(
    @CurrentEstablishmentId() establishmentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() body: BankMovementDto,
  ) {
    return {
      movement: await this.bankService.withdraw(
        establishmentId,
        id,
        user.id,
        body,
      ),
    };
  }
}
