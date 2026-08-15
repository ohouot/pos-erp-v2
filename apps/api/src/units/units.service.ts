import { Injectable } from "@nestjs/common";
import { UnitsRepository } from "./units.repository.js";
import type { CreateUnitDto } from "./dto/create-unit.dto.js";

@Injectable()
export class UnitsService {
  constructor(private readonly unitsRepository: UnitsRepository) {}

  list(establishmentId: string) {
    return this.unitsRepository.findAllForEstablishment(establishmentId);
  }

  create(establishmentId: string, input: CreateUnitDto) {
    return this.unitsRepository.create(establishmentId, input);
  }
}
