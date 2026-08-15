export interface Attendance {
  id: string;
  establishmentId: string;
  employeeId: string;
  employee?: { id: string; firstName: string; lastName: string } | null;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  notes: string | null;
}
