export interface Expense {
  id: string;
  establishmentId: string;
  categoryId: string;
  category?: { id: string; name: string };
  amount: string;
  description: string | null;
  expenseDate: string;
  employeeId: string;
  receiptUrl: string | null;
  createdAt: string;
}
