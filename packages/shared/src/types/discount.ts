import type { DiscountType } from "../enums.js";

export interface Discount {
  id: string;
  establishmentId: string;
  name: string;
  type: DiscountType;
  value: string;
  code: string | null;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  createdAt: string;
}
