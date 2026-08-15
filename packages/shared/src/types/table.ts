import type { TableStatus } from "../enums.js";

export interface DiningTable {
  id: string;
  establishmentId: string;
  name: string;
  capacity: number;
  zone: string | null;
  status: TableStatus;
  positionX: number;
  positionY: number;
  createdAt: string;
  updatedAt: string;
}
