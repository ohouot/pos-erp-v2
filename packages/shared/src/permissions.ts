// Catalogue canonique des permissions RBAC : "ressource:action".
// Utilisé (1) côté API pour peupler la table `permissions` au seed et pour
// les middlewares `requirePermission(...)`, et (2) côté frontend pour
// afficher/masquer les actions selon les droits de l'utilisateur connecté.

export const PERMISSIONS = {
  USERS: ["users:read", "users:create", "users:update", "users:delete"],
  ROLES: ["roles:read", "roles:create", "roles:update", "roles:delete"],
  ESTABLISHMENTS: [
    "establishments:read",
    "establishments:create",
    "establishments:update",
    "establishments:delete",
  ],
  PRODUCTS: [
    "products:read",
    "products:create",
    "products:update",
    "products:delete",
  ],
  CATEGORIES: [
    "categories:read",
    "categories:create",
    "categories:update",
    "categories:delete",
  ],
  SUPPLIERS: [
    "suppliers:read",
    "suppliers:create",
    "suppliers:update",
    "suppliers:delete",
  ],
  LOCATIONS: [
    "locations:read",
    "locations:create",
    "locations:update",
    "locations:delete",
  ],
  PURCHASES: [
    "purchases:read",
    "purchases:create",
    "purchases:validate",
    "purchases:cancel",
  ],
  INVENTORY: [
    "inventory:read",
    "inventory:adjust",
    "inventory:session:start",
    "inventory:session:complete",
  ],
  TABLES: ["tables:read", "tables:manage"],
  ORDERS: ["orders:read", "orders:create", "orders:update", "orders:cancel"],
  PAYMENTS: ["payments:create", "payments:read"],
  PAYMENT_METHODS: [
    "paymentMethods:read",
    "paymentMethods:create",
    "paymentMethods:update",
    "paymentMethods:delete",
  ],
  CASHIER: [
    "cashier:open",
    "cashier:close",
    "cashier:deposit",
    "cashier:withdraw",
    "cashier:read",
  ],
  BANK: [
    "bank:read",
    "bank:create",
    "bank:update",
    "bank:deposit",
    "bank:withdraw",
  ],
  CUSTOMERS: [
    "customers:read",
    "customers:create",
    "customers:update",
    "customers:delete",
  ],
  DISCOUNTS: [
    "discounts:read",
    "discounts:create",
    "discounts:update",
    "discounts:delete",
  ],
  EMPLOYEES: [
    "employees:read",
    "employees:create",
    "employees:update",
    "employees:delete",
  ],
  RESERVATIONS: [
    "reservations:read",
    "reservations:create",
    "reservations:update",
    "reservations:cancel",
  ],
  EXPENSES: [
    "expenses:read",
    "expenses:create",
    "expenses:update",
    "expenses:delete",
  ],
  REPORTS: ["reports:read", "reports:export"],
  SETTINGS: ["settings:read", "settings:update"],
  AUDIT: ["audit:read"],
} as const;

export const ALL_PERMISSIONS: string[] = Object.values(PERMISSIONS).flat();

// Attribution par défaut des permissions aux rôles système, utilisée au seed.
// Modifiable ensuite en base par un Administrateur (RBAC configurable, pas figé).
export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  "Super Administrateur": ALL_PERMISSIONS,
  Administrateur: ALL_PERMISSIONS.filter(
    (p) => !p.startsWith("establishments:delete"),
  ),
  Gérant: ALL_PERMISSIONS.filter(
    (p) => !p.startsWith("users:") && !p.startsWith("roles:"),
  ),
  Caissier: [
    ...PERMISSIONS.ORDERS,
    ...PERMISSIONS.PAYMENTS,
    ...PERMISSIONS.CASHIER,
    "products:read",
    "customers:read",
    "customers:create",
    "discounts:read",
    "tables:read",
    "paymentMethods:read",
  ],
  Serveur: [
    "orders:read",
    "orders:create",
    "orders:update",
    "tables:read",
    "tables:manage",
    "products:read",
    "customers:read",
    "customers:create",
    "discounts:read",
    "reservations:read",
    "reservations:create",
  ],
  "Responsable Stock": [
    ...PERMISSIONS.PRODUCTS,
    ...PERMISSIONS.CATEGORIES,
    ...PERMISSIONS.SUPPLIERS,
    ...PERMISSIONS.LOCATIONS,
    ...PERMISSIONS.PURCHASES,
    ...PERMISSIONS.INVENTORY,
  ],
  Comptable: [
    ...PERMISSIONS.EXPENSES,
    ...PERMISSIONS.REPORTS,
    ...PERMISSIONS.BANK,
    "purchases:read",
    "payments:read",
  ],
};
