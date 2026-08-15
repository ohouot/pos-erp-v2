import type { Category } from "./category.js";
import type { Location } from "./location.js";
import type { Supplier } from "./supplier.js";
import type { Unit } from "./unit.js";

export interface ProductUnit {
  id: string;
  productId: string;
  unitId: string;
  conversionToBase: string; // Decimal sérialisé en string sur le fil JSON
  isPurchaseUnit: boolean;
  isSaleUnit: boolean;
  barcode: string | null;
  unit?: Unit;
}

export interface Product {
  id: string;
  establishmentId: string;
  categoryId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  barcode: string | null;
  baseUnitId: string;
  purchasePrice: string;
  salePrice: string;
  // Niveaux de prix additionnels optionnels (happy hour, VIP...),
  // sélectionnables à la vente — voir OrderItemInput.priceTier.
  salePrice2: string | null;
  salePrice3: string | null;
  // Plancher de prix, jamais sélectionnable en caisse — plafonne les
  // remises de ligne (voir orders.service.assertAboveMinPrice).
  minSalePrice: string | null;
  taxRate: string;
  currentStock: string;
  minStock: string;
  expirationDate: string | null;
  locationId: string | null;
  // Informatif seulement : chaque bon de commande choisit son propre
  // fournisseur, ce champ ne fait que pré-remplir un choix par défaut.
  preferredSupplierId: string | null;
  // Faux pour un article de service : aucun contrôle/décrément de stock.
  manageStock: boolean;
  // Masque le produit du grid caisse sans le désactiver (isActive distinct).
  visibleAtPos: boolean;
  // Masque le produit du sélecteur produit des bons de commande.
  visibleOnPurchaseOrder: boolean;
  // Dormant tant qu'aucun module boutique en ligne n'existe.
  visibleOnlineStore: boolean;
  isComposed: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  category?: Category;
  baseUnit?: Unit;
  location?: Location;
  preferredSupplier?: Supplier;
  packagingUnits?: ProductUnit[];
}
