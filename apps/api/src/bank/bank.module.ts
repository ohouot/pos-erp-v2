import { Module } from "@nestjs/common";
import { BankController } from "./bank.controller.js";
import { BankService } from "./bank.service.js";
import { BankRepository } from "./bank.repository.js";

@Module({
  controllers: [BankController],
  providers: [BankService, BankRepository],
})
export class BankModule {}
