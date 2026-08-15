import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { ProductsService } from "./products.service.js";
import { ProductsCsvService } from "./products.csv.service.js";
import { AuditService } from "../audit/audit.service.js";
import { EstablishmentGuard } from "../common/guards/establishment.guard.js";
import { CurrentEstablishmentId } from "../common/decorators/current-establishment-id.decorator.js";
import { CurrentUser } from "../common/decorators/current-user.decorator.js";
import { RequirePermission } from "../common/decorators/require-permission.decorator.js";
import type { AuthenticatedUser } from "@pos-erp-v2/shared";
import { CreateProductDto } from "./dto/create-product.dto.js";
import { UpdateProductDto } from "./dto/update-product.dto.js";
import { ListProductsQueryDto } from "./dto/list-products-query.dto.js";
import { AdjustStockDto } from "./dto/adjust-stock.dto.js";

@Controller("products")
@UseGuards(EstablishmentGuard)
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly productsCsvService: ProductsCsvService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  async list(
    @CurrentEstablishmentId() establishmentId: string,
    @Query() query: ListProductsQueryDto,
  ) {
    const { items, meta } = await this.productsService.list(establishmentId, {
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
      search: query.search,
      categoryId: query.categoryId,
    });
    return { products: items, meta };
  }

  @Get("export")
  @RequirePermission("products:read")
  async exportCsv(
    @CurrentEstablishmentId() establishmentId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const csv = await this.productsCsvService.exportToCsv(establishmentId);
    res.set({
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="produits.csv"',
    });
    return csv;
  }

  @Post("import")
  @RequirePermission("products:create")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!file.originalname.toLowerCase().endsWith(".csv")) {
          cb(
            new BadRequestException("Le fichier doit être au format .csv"),
            false,
          );
          return;
        }
        cb(null, true);
      },
    }),
  )
  async importCsv(
    @CurrentEstablishmentId() establishmentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException("Fichier requis");
    const result = await this.productsCsvService.importFromCsv(
      establishmentId,
      user.id,
      file.buffer,
    );
    this.auditService.record({
      establishmentId,
      userId: user.id,
      action: "PRODUCT_IMPORTED",
      entityType: "Product",
    });
    return result;
  }

  @Get(":id")
  async get(
    @CurrentEstablishmentId() establishmentId: string,
    @Param("id") id: string,
  ) {
    return { product: await this.productsService.get(establishmentId, id) };
  }

  @Post()
  @RequirePermission("products:create")
  async create(
    @CurrentEstablishmentId() establishmentId: string,
    @Body() body: CreateProductDto,
  ) {
    return {
      product: await this.productsService.create(establishmentId, body),
    };
  }

  @Patch(":id")
  @RequirePermission("products:update")
  async update(
    @CurrentEstablishmentId() establishmentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() body: UpdateProductDto,
  ) {
    const product = await this.productsService.update(
      establishmentId,
      id,
      body,
    );
    this.auditService.record({
      establishmentId,
      userId: user.id,
      action: "PRODUCT_UPDATED",
      entityType: "Product",
      entityId: id,
    });
    return { product };
  }

  @Delete(":id")
  @RequirePermission("products:delete")
  @HttpCode(204)
  async remove(
    @CurrentEstablishmentId() establishmentId: string,
    @Param("id") id: string,
  ) {
    await this.productsService.remove(establishmentId, id);
  }

  @Post(":id/stock-adjustment")
  @RequirePermission("products:update")
  async adjustStock(
    @CurrentEstablishmentId() establishmentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() body: AdjustStockDto,
  ) {
    await this.productsService.adjustStock(
      establishmentId,
      id,
      body.targetQuantity,
      user.id,
      body.reason ?? "Ajustement depuis la fiche produit",
    );
    return { product: await this.productsService.get(establishmentId, id) };
  }
}
