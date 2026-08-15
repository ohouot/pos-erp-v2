import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { TablesRepository } from "./tables.repository.js";
import { RealtimeService } from "../realtime/realtime.service.js";
import type { CreateTableDto } from "./dto/create-table.dto.js";
import type { UpdateTableDto } from "./dto/update-table.dto.js";

function translatePrismaError(err: unknown): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      throw new ConflictException("Une table avec ce nom existe déjà");
    }
    if (err.code === "P2003" || err.code === "P2025") {
      throw new BadRequestException(
        "Table référencée ailleurs (commande, réservation)",
      );
    }
  }
  throw err;
}

@Injectable()
export class TablesService {
  constructor(
    private readonly tablesRepository: TablesRepository,
    private readonly realtimeService: RealtimeService,
  ) {}

  list(establishmentId: string) {
    return this.tablesRepository.findAllForEstablishment(establishmentId);
  }

  create(establishmentId: string, input: CreateTableDto) {
    return this.tablesRepository
      .create(establishmentId, input)
      .catch(translatePrismaError);
  }

  private async findOrThrow(establishmentId: string, id: string) {
    const table = await this.tablesRepository.findById(establishmentId, id);
    if (!table) throw new NotFoundException("Table introuvable");
    return table;
  }

  async update(establishmentId: string, id: string, input: UpdateTableDto) {
    await this.findOrThrow(establishmentId, id);
    const table = await this.tablesRepository
      .update(id, input)
      .catch(translatePrismaError);
    if (input.status !== undefined) {
      this.realtimeService.emitToEstablishment(
        establishmentId,
        "table:updated",
        {},
      );
    }
    return table;
  }

  async remove(establishmentId: string, id: string) {
    await this.findOrThrow(establishmentId, id);
    await this.tablesRepository.remove(id).catch(translatePrismaError);
  }
}
