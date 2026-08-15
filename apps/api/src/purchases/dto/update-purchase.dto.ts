import { PartialType } from "@nestjs/mapped-types";
import { CreatePurchaseDto } from "./create-purchase.dto.js";

export class UpdatePurchaseDto extends PartialType(CreatePurchaseDto) {}
