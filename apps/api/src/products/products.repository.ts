import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service.js";

export interface ProductUnitInput {
  unitId: string;
  conversionToBase: number;
  isPurchaseUnit?: boolean;
  isSaleUnit?: boolean;
  barcode?: string;
}

export interface ProductWriteData {
  categoryId: string;
  name: string;
  description?: string;
  imageUrl?: string;
  barcode?: string;
  baseUnitId: string;
  purchasePrice: number;
  salePrice: number;
  salePrice2?: number;
  salePrice3?: number;
  minSalePrice?: number;
  taxRate?: number;
  minStock?: number;
  expirationDate?: Date;
  locationId?: string;
  preferredSupplierId?: string;
  manageStock?: boolean;
  visibleAtPos?: boolean;
  visibleOnPurchaseOrder?: boolean;
  visibleOnlineStore?: boolean;
  isComposed?: boolean;
  isActive?: boolean;
  packagingUnits?: ProductUnitInput[];
}

const productInclude = {
  category: true,
  baseUnit: true,
  location: true,
  preferredSupplier: true,
  packagingUnits: { include: { unit: true } },
} satisfies Prisma.ProductInclude;

@Injectable()
export class ProductsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(establishmentId: string, data: ProductWriteData) {
    const {
      packagingUnits,
      categoryId,
      baseUnitId,
      locationId,
      preferredSupplierId,
      ...rest
    } = data;
    return this.prisma.product.create({
      data: {
        ...rest,
        establishment: { connect: { id: establishmentId } },
        category: { connect: { id: categoryId } },
        baseUnit: { connect: { id: baseUnitId } },
        ...(locationId ? { location: { connect: { id: locationId } } } : {}),
        ...(preferredSupplierId
          ? { preferredSupplier: { connect: { id: preferredSupplierId } } }
          : {}),
        ...(packagingUnits
          ? {
              packagingUnits: {
                create: packagingUnits.map((u) => ({
                  unit: { connect: { id: u.unitId } },
                  conversionToBase: u.conversionToBase,
                  isPurchaseUnit: u.isPurchaseUnit ?? false,
                  isSaleUnit: u.isSaleUnit ?? false,
                  barcode: u.barcode,
                })),
              },
            }
          : {}),
      },
      include: productInclude,
    });
  }

  // Remplace intégralement les unités d'emballage si packagingUnits est
  // fourni ; les laisse intactes si la clé est absente (même contrat que le
  // projet de référence).
  async update(id: string, data: Partial<ProductWriteData>) {
    const {
      packagingUnits,
      categoryId,
      baseUnitId,
      locationId,
      preferredSupplierId,
      ...rest
    } = data;
    return this.prisma.$transaction(async (tx) => {
      if (packagingUnits) {
        await tx.productUnit.deleteMany({ where: { productId: id } });
      }
      return tx.product.update({
        where: { id },
        data: {
          ...rest,
          ...(categoryId ? { category: { connect: { id: categoryId } } } : {}),
          ...(baseUnitId ? { baseUnit: { connect: { id: baseUnitId } } } : {}),
          ...(locationId !== undefined
            ? locationId
              ? { location: { connect: { id: locationId } } }
              : { location: { disconnect: true } }
            : {}),
          ...(preferredSupplierId !== undefined
            ? preferredSupplierId
              ? { preferredSupplier: { connect: { id: preferredSupplierId } } }
              : { preferredSupplier: { disconnect: true } }
            : {}),
          ...(packagingUnits
            ? {
                packagingUnits: {
                  create: packagingUnits.map((u) => ({
                    unit: { connect: { id: u.unitId } },
                    conversionToBase: u.conversionToBase,
                    isPurchaseUnit: u.isPurchaseUnit ?? false,
                    isSaleUnit: u.isSaleUnit ?? false,
                    barcode: u.barcode,
                  })),
                },
              }
            : {}),
        },
        include: productInclude,
      });
    });
  }

  findById(establishmentId: string, id: string) {
    return this.prisma.product.findFirst({
      where: { id, establishmentId, deletedAt: null },
      include: productInclude,
    });
  }

  findByBarcode(establishmentId: string, barcode: string) {
    return this.prisma.product.findFirst({
      where: { establishmentId, barcode, deletedAt: null },
    });
  }

  // Repli d'import CSV uniquement — comparaison insensible à la casse.
  findByNameForImport(establishmentId: string, name: string) {
    return this.prisma.product.findFirst({
      where: {
        establishmentId,
        deletedAt: null,
        name: { equals: name, mode: "insensitive" },
      },
    });
  }

  async findAllPaginated(
    establishmentId: string,
    params: {
      page: number;
      pageSize: number;
      search?: string;
      categoryId?: string;
    },
  ) {
    const where: Prisma.ProductWhereInput = {
      establishmentId,
      deletedAt: null,
      ...(params.categoryId ? { categoryId: params.categoryId } : {}),
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: "insensitive" } },
              { barcode: { contains: params.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: productInclude,
        orderBy: { name: "asc" },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, total };
  }

  findAllForExport(establishmentId: string) {
    return this.prisma.product.findMany({
      where: { establishmentId, deletedAt: null },
      include: productInclude,
      orderBy: { name: "asc" },
    });
  }

  softDelete(id: string) {
    return this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }
}
