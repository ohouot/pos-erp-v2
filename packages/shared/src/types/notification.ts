export const NOTIFICATION_TYPES = [
  "LOW_STOCK",
  "NEW_ORDER",
  "INVENTORY_DUE",
  "ALERT",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface Notification {
  id: string;
  establishmentId: string;
  userId: string | null;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
}
