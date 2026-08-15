export interface WorkShift {
  id: string;
  establishmentId: string;
  employeeId: string;
  employee?: { id: string; firstName: string; lastName: string } | null;
  startTime: string;
  endTime: string;
  role: string | null;
  notes: string | null;
  createdAt: string;
}
