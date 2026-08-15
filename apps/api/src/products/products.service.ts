import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  ProductsRepository,
  type ProductWriteData,
} from "./products.repository.js";
import { StockMovementsService } from "../stock/stock-movements.service.js";
import type { CreateProductDto } from "./dto/create-product.dto.js";
import type { UpdateProductDto } from "./dto/update-product.dto.js";

let barcodeCounter = 0;

// Code-barres auto-généré quand aucun n'est saisi : horodatage (14 chiffres)
// + compteur rotatif 3 chiffres (anti-collision si plusieurs créations dans
// la même seconde) + les 6 derniers caractères de l'établissement en
// majuscules (évite les collisions inter-établissements sur un import
// concurrent). Même algorithme que le projet de référence.
export function generateBarcode(establishmentId: string): string {
  const now = new Date();
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  const timestamp =
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  barcodeCounter = (barcodeCounter + 1) % 1000;
  const suffix = establishmentId.slice(-6).toUpperCase();
  return `${timestamp}${pad(barcodeCounter, 3)}${suffix}`;
}

function translatePrismaError(err: unknown): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      throw new ConflictException("Un produit avec ce code-barres existe déjà");
    }
    if (err.code === "P2025" || err.code === "P2003") {
      throw new BadRequestException(
        "Catégorie, unité, emplacement ou fournisseur invalide",
      );
    }
  }
  throw err;
}

// Le plancher de remise (minSalePrice) ne doit jamais dépasser un des prix
// de vente configurés — sinon aucune vente ne pourrait jamais le respecter.
function assertRespectsMinSalePrice(input: {
  minSalePrice?: number;
  salePrice?: number;
  salePrice2?: number;
  salePrice3?: number;
}): void {
  if (input.minSalePrice == null) return;
  const prices = [input.salePrice, input.salePrice2, input.salePrice3];
  const violates = prices.some(
    (price) => price != null && price < input.minSalePrice!,
  );
  if (violates) {
    throw new BadRequestException(
      "Le prix de vente minimum autorisé ne peut pas dépasser un prix de vente",
    );
  }
}

@Injectable()
export class ProductsService {
  constructor(
    private readonly productsRepository: ProductsRepository,
    private readonly stockMovementsService: StockMovementsService,
  ) {}

  async create(establishmentId: string, input: CreateProductDto) {
    assertRespectsMinSalePrice(input);
    const data: ProductWriteData = {
      ...input,
      barcode: input.barcode || generateBarcode(establishmentId),
      expirationDate: input.expirationDate
        ? new Date(input.expirationDate)
        : undefined,
    };
    return this.productsRepository
      .create(establishmentId, data)
      .catch(translatePrismaError);
  }

  private async findOrThrow(establishmentId: string, id: string) {
    const product = await this.productsRepository.findById(establishmentId, id);
    if (!product) throw new NotFoundException("Produit introuvable");
    return product;
  }

  get(establishmentId: string, id: string) {
    return this.findOrThrow(establishmentId, id);
  }

  async update(establishmentId: string, id: string, input: UpdateProductDto) {
    const existing = await this.findOrThrow(establishmentId, id);
    assertRespectsMinSalePrice({
      minSalePrice:
        input.minSalePrice ??
        (existing.minSalePrice != null
          ? Number(existing.minSalePrice)
          : undefined),
      salePrice: input.salePrice ?? Number(existing.salePrice),
      salePrice2:
        input.salePrice2 ??
        (existing.salePrice2 != null ? Number(existing.salePrice2) : undefined),
      salePrice3:
        input.salePrice3 ??
        (existing.salePrice3 != null ? Number(existing.salePrice3) : undefined),
    });
    const data: Partial<ProductWriteData> = {
      ...input,
      expirationDate: input.expirationDate
        ? new Date(input.expirationDate)
        : undefined,
    };
    return this.productsRepository.update(id, data).catch(translatePrismaError);
  }

  async remove(establishmentId: string, id: string) {
    await this.findOrThrow(establishmentId, id);
    await this.productsRepository.softDelete(id);
  }

  async list(
    establishmentId: string,
    params: {
      page: number;
      pageSize: number;
      search?: string;
      categoryId?: string;
    },
  ) {
    const { items, total } = await this.productsRepository.findAllPaginated(
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

  async adjustStock(
    establishmentId: string,
    productId: string,
    targetQuantity: number,
    employeeId: string | undefined,
    reason: string,
  ) {
    await this.findOrThrow(establishmentId, productId);
    await this.stockMovementsService.setAbsoluteQuantity(
      establishmentId,
      productId,
      targetQuantity,
      employeeId,
      reason,
    );
  }
}
