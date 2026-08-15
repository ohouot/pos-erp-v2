export interface Payment {
  id: string;
  establishmentId: string;
  orderId: string;
  cashSessionId: string | null;
  paymentMethodId: string;
  paymentMethod?: { id: string; code: string; label: string };
  amount: string;
  amountReceived: string | null;
  changeGiven: string | null;
  reference: string | null;
  employeeId: string;
  createdAt: string;
}
