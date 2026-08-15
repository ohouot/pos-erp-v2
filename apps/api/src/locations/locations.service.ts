import { Injectable, NotFoundException } from "@nestjs/common";
import { LocationsRepository } from "./locations.repository.js";
import type { CreateLocationDto } from "./dto/create-location.dto.js";
import type { UpdateLocationDto } from "./dto/update-location.dto.js";

@Injectable()
export class LocationsService {
  constructor(private readonly locationsRepository: LocationsRepository) {}

  list(establishmentId: string) {
    return this.locationsRepository.findAllForEstablishment(establishmentId);
  }

  create(establishmentId: string, input: CreateLocationDto) {
    return this.locationsRepository.create(establishmentId, input);
  }

  private async findOrThrow(establishmentId: string, id: string) {
    const location = await this.locationsRepository.findById(
      establishmentId,
      id,
    );
    if (!location) throw new NotFoundException("Emplacement introuvable");
    return location;
  }

  async update(establishmentId: string, id: string, input: UpdateLocationDto) {
    await this.findOrThrow(establishmentId, id);
    return this.locationsRepository.update(id, input);
  }

  async remove(establishmentId: string, id: string) {
    await this.findOrThrow(establishmentId, id);
    await this.locationsRepository.softDelete(id);
  }
}
