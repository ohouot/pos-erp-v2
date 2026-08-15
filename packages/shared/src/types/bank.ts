import type { BankMovementType } from "../enums.js";

export interface BankMovement {
  id: string;
  bankAccountId: string;
  type: BankMovementType;
  amount: string;
  reason: string | null;
  employeeId: string;
  createdAt: string;
}

export interface BankAccount {
  id: string;
  establishmentId: string;
  name: string;
  currentBalance: string;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  movements: BankMovement[];
}
