import { Injectable, NotFoundException } from "@nestjs/common";
import { CustomersRepository } from "./customers.repository.js";
import type { CreateCustomerDto } from "./dto/create-customer.dto.js";
import type { UpdateCustomerDto } from "./dto/update-customer.dto.js";

@Injectable()
export class CustomersService {
  constructor(private readonly customersRepository: CustomersRepository) {}

  async list(
    establishmentId: string,
    params: { page: number; pageSize: number; search?: string },
  ) {
    const { items, total } = await this.customersRepository.findAllPaginated(
      establishmentId,
      params,
    );
    return {
      items,
      meta: {
        page: params.page,
        pageSize: params.pageSize,
        total,
        totalPages: Math.ceil(total / params.pageSize),
      },
    };
  }

  create(establishmentId: string, input: CreateCustomerDto) {
    return this.customersRepository.create(establishmentId, input);
  }

  private async findOrThrow(establishmentId: string, id: string) {
    const customer = await this.customersRepository.findById(
      establishmentId,
      id,
    );
    if (!customer) throw new NotFoundException("Client introuvable");
    return customer;
  }

  get(establishmentId: string, id: string) {
    return this.findOrThrow(establishmentId, id);
  }

  async orderHistory(establishmentId: string, id: string) {
    await this.findOrThrow(establishmentId, id);
    return this.customersRepository.findPaidOrders(establishmentId, id);
  }

  async update(establishmentId: string, id: string, input: UpdateCustomerDto) {
    await this.findOrThrow(establishmentId, id);
    return this.customersRepository.update(id, input);
  }

  async remove(establishmentId: string, id: string) {
    await this.findOrThrow(establishmentId, id);
    await this.customersRepository.softDelete(id);
  }
}
