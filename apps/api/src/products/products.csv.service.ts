import { Injectable } from "@nestjs/common";
import { parse } from "csv-parse/sync";
import { PrismaService } from "../prisma/prisma.service.js";
import { ProductsRepository } from "./products.repository.js";
import { CategoriesRepository } from "../categories/categories.repository.js";
import { StockMovementsService } from "../stock/stock-movements.service.js";
import { generateBarcode } from "./products.service.js";

// Colonnes CSV françaises — exact même ordre/libellés des deux côtés
// (import et export) que le projet de référence.
const F = {
  name: "Désignation",
  price1: "Prix de vente 1",
  price2: "Prix de vente 2",
  price3: "Prix de vente 3",
  purchasePrice: "Prix achat",
  margin: "Marge",
  quantity: "Quantité",
  unit: "Unité de mesure",
  category: "Famille",
  barcode: "Code barre",
  supplier: "Fournisseur",
  expirationDate: "Date d'expiration",
  location: "Emplacement",
  minStock: "Seuil",
  photo: "Photo",
  description: "Description",
} as const;

const CSV_HEADERS = [
  F.name,
  F.price1,
  F.price2,
  F.price3,
  F.purchasePrice,
  F.margin,
  F.quantity,
  F.unit,
  F.category,
  F.barcode,
  F.supplier,
  F.expirationDate,
  F.location,
  F.minStock,
  F.photo,
  F.description,
];

const DEFAULT_UNIT_NAME = "Pièce";

export interface ImportRowError {
  row: number;
  message: string;
}

export interface ImportResult {
  createdCount: number;
  updatedCount: number;
  errors: ImportRowError[];
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ");
}

const NORMALIZED_TO_CANONICAL = new Map(
  CSV_HEADERS.map((h) => [normalizeText(h), h]),
);

function mapHeaders(headerRow: string[]): string[] {
  return headerRow.map(
    (h) => NORMALIZED_TO_CANONICAL.get(normalizeText(h)) ?? h,
  );
}

// Compte les occurrences sur la ligne d'en-tête uniquement (pas une
// détection ligne par ligne) : un code-barres en notation scientifique
// ("2,03E+17") sur une seule ligne pourrait sinon fausser tout le fichier.
function detectDelimiter(headerLine: string): string {
  const counts: Record<string, number> = {
    ";": (headerLine.match(/;/g) ?? []).length,
    ",": (headerLine.match(/,/g) ?? []).length,
    "\t": (headerLine.match(/\t/g) ?? []).length,
  };
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function decodeCsvBuffer(buffer: Buffer): string {
  const utf8 = buffer.toString("utf-8");
  if (utf8.includes("�")) {
    return buffer.toString("latin1");
  }
  return utf8;
}

// Excel convertit parfois un long code-barres numérique en notation
// scientifique ("2,03E+17") — inutilisable tel quel, on le traite comme
// absent plutôt que de créer une fausse collision.
function isUsableBarcode(value: string | undefined): value is string {
  if (!value) return false;
  return !/^\d+(?:[.,]\d+)?e\+?\d+$/i.test(value.trim());
}

// Convertit un JJ/MM/AAAA ou JJ-MM-AAAA en ISO avant parsing — sinon Date()
// interprète le format jour-premier de travers.
function parseFrenchDate(value: string): Date | undefined {
  const match = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(value.trim());
  if (match) {
    const [, day, month, year] = match;
    return new Date(
      `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`,
    );
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function parseNumber(value: string | undefined): number | undefined {
  if (value == null || value.trim() === "") return undefined;
  const normalized = value.trim().replace(",", ".");
  const num = Number(normalized);
  return Number.isNaN(num) ? undefined : num;
}

function csvEscape(value: string): string {
  if (/[;,"\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

@Injectable()
export class ProductsCsvService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productsRepository: ProductsRepository,
    private readonly categoriesRepository: CategoriesRepository,
    private readonly stockMovementsService: StockMovementsService,
  ) {}

  async importFromCsv(
    establishmentId: string,
    employeeId: string | undefined,
    buffer: Buffer,
  ): Promise<ImportResult> {
    const text = decodeCsvBuffer(buffer);
    const headerLine = text.split(/\r?\n/, 1)[0] ?? "";
    const delimiter = detectDelimiter(headerLine);

    const records: Record<string, string>[] = parse(text, {
      columns: mapHeaders,
      skip_empty_lines: true,
      trim: true,
      bom: true,
      delimiter,
      relax_column_count: true,
    });

    const categories =
      await this.categoriesRepository.findAllForEstablishment(establishmentId);
    const categoriesByNormalizedName = new Map(
      categories.map((c) => [normalizeText(c.name), c]),
    );

    let createdCount = 0;
    let updatedCount = 0;
    const errors: ImportRowError[] = [];

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const rowNumber = i + 2; // ligne 1 = en-tête

      try {
        const name = row[F.name]?.trim();
        const price1 = parseNumber(row[F.price1]);
        const purchasePrice = parseNumber(row[F.purchasePrice]);
        const categoryName = row[F.category]?.trim();

        const rowErrors: string[] = [];
        if (!name) rowErrors.push(`"${F.name}" requis`);
        if (price1 === undefined) rowErrors.push(`"${F.price1}" requis`);
        if (purchasePrice === undefined)
          rowErrors.push(`"${F.purchasePrice}" requis`);
        if (!categoryName) rowErrors.push(`"${F.category}" requis`);
        if (rowErrors.length > 0) {
          errors.push({ row: rowNumber, message: rowErrors.join(", ") });
          continue;
        }

        const rawBarcode = row[F.barcode]?.trim();
        const barcode = isUsableBarcode(rawBarcode) ? rawBarcode : undefined;
        const unitName = row[F.unit]?.trim() || DEFAULT_UNIT_NAME;
        const supplierName = row[F.supplier]?.trim();
        const locationName = row[F.location]?.trim();

        const [unit, existingByBarcode, supplier, location] = await Promise.all(
          [
            this.prisma.unit.findFirst({
              where: {
                OR: [{ establishmentId: null }, { establishmentId }],
                AND: {
                  OR: [
                    { name: { equals: unitName, mode: "insensitive" } },
                    { symbol: { equals: unitName, mode: "insensitive" } },
                  ],
                },
              },
            }),
            barcode
              ? this.productsRepository.findByBarcode(establishmentId, barcode)
              : null,
            supplierName
              ? this.prisma.supplier.findFirst({
                  where: {
                    establishmentId,
                    deletedAt: null,
                    name: { equals: supplierName, mode: "insensitive" },
                  },
                })
              : null,
            locationName
              ? this.prisma.location.findFirst({
                  where: {
                    establishmentId,
                    deletedAt: null,
                    name: { equals: locationName, mode: "insensitive" },
                  },
                })
              : null,
          ],
        );

        const category =
          categories.find(
            (c) => c.name.toLowerCase() === categoryName!.toLowerCase(),
          ) ?? categoriesByNormalizedName.get(normalizeText(categoryName!));

        if (!category) {
          errors.push({
            row: rowNumber,
            message: `Famille "${categoryName}" introuvable`,
          });
          continue;
        }
        if (!unit) {
          errors.push({
            row: rowNumber,
            message: `Unité "${unitName}" introuvable`,
          });
          continue;
        }

        const targetQuantity = parseNumber(row[F.quantity]);
        const expirationDateRaw = row[F.expirationDate]?.trim();

        const fields = {
          name: name!,
          categoryId: category.id,
          baseUnitId: unit.id,
          purchasePrice: purchasePrice!,
          salePrice: price1!,
          salePrice2: parseNumber(row[F.price2]),
          salePrice3: parseNumber(row[F.price3]),
          minStock: parseNumber(row[F.minStock]) ?? 0,
          expirationDate: expirationDateRaw
            ? parseFrenchDate(expirationDateRaw)
            : undefined,
          description: row[F.description]?.trim() || undefined,
          imageUrl: row[F.photo]?.trim() || undefined,
          preferredSupplierId: supplier?.id,
          locationId: location?.id,
        };

        const existing =
          existingByBarcode ??
          (await this.productsRepository.findByNameForImport(
            establishmentId,
            name!,
          ));

        if (existing) {
          await this.productsRepository.update(existing.id, {
            ...fields,
            ...(barcode ? { barcode } : {}),
          });
          if (targetQuantity !== undefined) {
            await this.stockMovementsService.setAbsoluteQuantity(
              establishmentId,
              existing.id,
              targetQuantity,
              employeeId,
              "Import CSV (mise à jour du stock)",
            );
          }
          updatedCount++;
        } else {
          const created = await this.productsRepository.create(
            establishmentId,
            {
              ...fields,
              barcode: barcode || generateBarcode(establishmentId),
              taxRate: 0,
              manageStock: true,
              visibleAtPos: true,
              visibleOnPurchaseOrder: true,
              visibleOnlineStore: false,
              isComposed: false,
              packagingUnits: [],
            },
          );
          if (targetQuantity && targetQuantity > 0) {
            await this.stockMovementsService.setAbsoluteQuantity(
              establishmentId,
              created.id,
              targetQuantity,
              employeeId,
              "Import CSV",
            );
          }
          createdCount++;
        }
      } catch (err) {
        errors.push({
          row: rowNumber,
          message: `échec de l'import : ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    }

    return { createdCount, updatedCount, errors };
  }

  async exportToCsv(establishmentId: string): Promise<string> {
    const products =
      await this.productsRepository.findAllForExport(establishmentId);

    const lines = [CSV_HEADERS.join(";")];
    for (const p of products) {
      const margin = Number(p.salePrice) - Number(p.purchasePrice);
      const row = [
        p.name,
        String(p.salePrice),
        p.salePrice2 != null ? String(p.salePrice2) : "",
        p.salePrice3 != null ? String(p.salePrice3) : "",
        String(p.purchasePrice),
        margin.toFixed(2),
        String(p.currentStock),
        p.baseUnit.symbol,
        p.category.name,
        p.barcode ?? "",
        p.preferredSupplier?.name ?? "",
        p.expirationDate ? p.expirationDate.toISOString().slice(0, 10) : "",
        p.location?.name ?? "",
        String(p.minStock),
        p.imageUrl ?? "",
        p.description ?? "",
      ];
      lines.push(row.map((v) => csvEscape(String(v))).join(";"));
    }

    return "﻿" + lines.join("\r\n");
  }
}
