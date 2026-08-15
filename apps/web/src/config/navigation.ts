// Même logique que apps/web/src/config/navigation.ts du projet de référence :
// un item sans `permission` est toujours visible, sinon filtré contre
// `user.permissions`. Liste volontairement réduite au Lot 1 (auth/RBAC) —
// complétée au fil des lots suivants au rythme des modules reconstruits.
export interface NavItem {
  label: string;
  href: string;
  permission?: string;
  // Contrôle plateforme binaire (User.isSuperAdmin), hors du système RBAC
  // par permission — voir Lot 9, module backups (opération cross-tenant).
  superAdminOnly?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Tableau de bord", href: "/" },
  { label: "Caisse", href: "/pos" },
  { label: "Salle", href: "/tables" },
  { label: "Commandes", href: "/orders" },
  { label: "Cuisine", href: "/kitchen" },
  { label: "Produits", href: "/products", permission: "products:read" },
  { label: "Stock", href: "/stock", permission: "inventory:read" },
  { label: "Inventaire", href: "/inventory", permission: "inventory:read" },
  { label: "Achats", href: "/purchases", permission: "purchases:create" },
  { label: "Session de caisse", href: "/cashier", permission: "cashier:read" },
  {
    label: "Modes de paiement",
    href: "/payment-methods",
    permission: "paymentMethods:read",
  },
  { label: "Banque", href: "/bank", permission: "bank:read" },
  { label: "Clients", href: "/customers", permission: "customers:read" },
  { label: "Remises", href: "/discounts", permission: "discounts:read" },
  {
    label: "Réservations",
    href: "/reservations",
    permission: "reservations:read",
  },
  { label: "Dépenses", href: "/expenses", permission: "expenses:read" },
  { label: "Employés", href: "/employees", permission: "employees:read" },
  { label: "Journal d'audit", href: "/audit-logs", permission: "audit:read" },
  { label: "Utilisateurs", href: "/users", permission: "users:read" },
  { label: "Rôles", href: "/roles", permission: "roles:read" },
  { label: "Paramètres", href: "/settings", permission: "establishments:read" },
  { label: "Rapport de clôture", href: "/reports", permission: "reports:read" },
  // Contrairement au projet de référence (page fonctionnelle mais orpheline,
  // sans route ni entrée de navigation) : raccordée ici délibérément.
  { label: "Sauvegardes", href: "/backups", superAdminOnly: true },
];
