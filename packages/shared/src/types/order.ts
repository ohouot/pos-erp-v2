import type {
  DiscountType,
  OrderItemStatus,
  OrderStatus,
  OrderType,
} from "../enums.js";
import type { Payment } from "./payment.js";

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  // Libellé et coût d'achat figés au moment de la vente (voir
  // orders.service.resolveItem côté API) — null pour les lignes créées
  // avant l'introduction de ce champ.
  productName: string | null;
  unitCost: string | null;
  quantity: string;
  unitPrice: string;
  taxRate: string;
  discountAmount: string;
  totalPrice: string;
  status: OrderItemStatus;
  notes: string | null;
  createdAt: string;
  product?: { id: string; name: string; isComposed: boolean };
}

export interface Order {
  id: string;
  establishmentId: string;
  orderNumber: string;
  // Numéro de facture séquentiel sans trou, attribué uniquement à
  // l'encaissement (voir payments.service.assignInvoiceNumber côté API) —
  // null tant que la commande n'est pas payée.
  invoiceNumber: string | null;
  // Session de caisse ouverte au moment de la création, figée — voir
  // orders.service.createOrder côté API. Null si créée hors session
  // ouverte.
  cashSessionId: string | null;
  customerId: string | null;
  customer?: { id: string; firstName: string; lastName: string | null } | null;
  employeeId: string;
  // Responsable rattaché à la vente, distinct du caissier (employeeId).
  administratorId: string | null;
  status: OrderStatus;
  orderType: OrderType;
  subtotal: string;
  taxAmount: string;
  discountAmount: string;
  // Remise sur le ticket entier, distincte des remises par ligne (déjà
  // agrégées dans discountAmount) — voir orders.pricing.applyGlobalDiscount.
  globalDiscountType: DiscountType | null;
  globalDiscountValue: string | null;
  totalAmount: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  items: OrderItem[];
  tables: Array<{ id: string; name: string }>;
  payments: Payment[];
}
