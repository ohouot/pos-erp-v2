import type { EstablishmentType } from "../enums.js";
import type { EstablishmentSettings } from "../schemas/establishment.js";

// Reflète la sérialisation JSON réelle de l'entité Prisma Establishment :
// les champs Decimal (taxRate) sont sérialisés en string, pas en number.
export interface Establishment {
  id: string;
  ownerId: string;
  name: string;
  type: EstablishmentType;
  logoUrl: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  currency: string;
  taxRate: string;
  language: string;
  timezone: string;
  settings: EstablishmentSettings | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EstablishmentWithRole extends Establishment {
  myRole: string | null;
}
