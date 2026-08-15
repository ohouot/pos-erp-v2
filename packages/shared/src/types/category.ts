export interface Category {
  id: string;
  establishmentId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  color: string | null;
  parentId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
