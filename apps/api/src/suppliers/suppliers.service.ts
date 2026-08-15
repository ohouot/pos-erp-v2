import { Injectable, NotFoundException } from "@nestjs/common";
import { SuppliersRepository } from "./suppliers.repository.js";
import type { CreateSupplierDto } from "./dto/create-supplier.dto.js";
import type { UpdateSupplierDto } from "./dto/update-supplier.dto.js";

@Injectable()
export class SuppliersService {
  constructor(private readonly suppliersRepository: SuppliersRepository) {}

  list(establishmentId: string) {
    return this.suppliersRepository.findAllForEstablishment(establishmentId);
  }

  create(establishmentId: string, input: CreateSupplierDto) {
    return this.suppliersRepository.create(establishmentId, input);
  }

  private async findOrThrow(establishmentId: string, id: string) {
    const supplier = await this.suppliersRepository.findById(
      establishmentId,
      id,
    );
    if (!supplier) throw new NotFoundException("Fournisseur introuvable");
    return supplier;
  }

  async update(establishmentId: string, id: string, input: UpdateSupplierDto) {
    await this.findOrThrow(establishmentId, id);
    return this.suppliersRepository.update(id, input);
  }

  async remove(establishmentId: string, id: string) {
    await this.findOrThrow(establishmentId, id);
    await this.suppliersRepository.softDelete(id);
  }
}
