import type { ReservationStatus } from "../enums.js";

export interface Reservation {
  id: string;
  establishmentId: string;
  customerId: string | null;
  customer?: { id: string; firstName: string; lastName: string | null } | null;
  tableId: string | null;
  table?: { id: string; name: string } | null;
  reservationDate: string;
  startTime: string;
  endTime: string | null;
  partySize: number;
  status: ReservationStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}
