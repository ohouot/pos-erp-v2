export interface Employee {
  id: string; // id de la relation UserEstablishment (l'identité "employé")
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  role: { id: string; name: string };
  vendorCode: string | null;
  position: string | null;
  salary: string | null;
  hireDate: string | null;
  contractType: string | null;
  notes: string | null;
  createdAt: string;
}

export interface Role {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: string[];
}
