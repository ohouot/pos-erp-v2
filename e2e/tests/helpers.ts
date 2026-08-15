import type { Page } from "@playwright/test";

const API_URL = process.env.E2E_API_URL ?? "http://127.0.0.1:4100";

export interface RegisteredUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  establishmentName: string;
}

// Inscrit un nouvel établissement + compte administrateur via le vrai
// formulaire (pas un raccourci API) : établissement fraîchement créé, donc
// sélectionné automatiquement (un seul établissement, voir
// selectSoleEstablishment côté auth.ts) — pas besoin de manipuler
// l'EstablishmentSwitcher pour la suite du parcours.
export async function registerNewEstablishment(
  page: Page,
): Promise<RegisteredUser> {
  const stamp = Date.now();
  const user: RegisteredUser = {
    email: `e2e_${stamp}@example.com`,
    password: "E2ePassword123!",
    firstName: "E2E",
    lastName: "Tester",
    establishmentName: `E2E Etab ${stamp}`,
  };

  await page.goto("/register");
  await page.fill("#firstName", user.firstName);
  await page.fill("#lastName", user.lastName);
  await page.fill("#email", user.email);
  await page.fill("#password", user.password);
  await page.fill("#establishmentName", user.establishmentName);
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await page.waitForURL("/");

  return user;
}

// Récupère le token NestJS courant depuis la session next-auth déjà établie
// dans le contexte du navigateur (cookie de session) — utilisé pour des
// appels API directs de mise en place de données (créer un produit), plus
// rapides et plus robustes qu'un passage par le formulaire produit pour un
// simple prérequis de test.
export async function getAccessToken(page: Page): Promise<string> {
  const res = await page.request.get("/api/auth/session");
  const session = (await res.json()) as { accessToken: string };
  return session.accessToken;
}

export async function createTestProduct(
  page: Page,
  token: string,
  overrides?: Partial<{
    name: string;
    salePrice: number;
    purchasePrice: number;
  }>,
): Promise<{ id: string; name: string }> {
  const stamp = Date.now();
  // Un établissement fraîchement inscrit ne seed que ses moyens de paiement
  // par défaut (voir EstablishmentsRepository.createEstablishment) — pas de
  // catégorie/unité de démonstration : il faut les créer avant tout produit.
  const authHeaders = { Authorization: `Bearer ${token}` };
  const categoryRes = await page.request.post(`${API_URL}/api/v1/categories`, {
    headers: authHeaders,
    data: { name: `Catégorie E2E ${stamp}` },
  });
  const category = await categoryRes.json();
  if (!categoryRes.ok())
    throw new Error(
      `Échec de création de la catégorie de test : ${JSON.stringify(category)}`,
    );

  const unitRes = await page.request.post(`${API_URL}/api/v1/units`, {
    headers: authHeaders,
    data: { name: `Unité E2E ${stamp}`, symbol: "u" },
  });
  const unit = await unitRes.json();
  if (!unitRes.ok())
    throw new Error(
      `Échec de création de l'unité de test : ${JSON.stringify(unit)}`,
    );

  const name = overrides?.name ?? `Produit E2E ${stamp}`;
  const res = await page.request.post(`${API_URL}/api/v1/products`, {
    headers: authHeaders,
    data: {
      name,
      categoryId: category.category.id,
      baseUnitId: unit.unit.id,
      salePrice: overrides?.salePrice ?? 1000,
      purchasePrice: overrides?.purchasePrice ?? 500,
      minStock: 0,
    },
  });
  const body = await res.json();
  if (!res.ok())
    throw new Error(
      `Échec de création du produit de test : ${JSON.stringify(body)}`,
    );

  // Stock initial : setAbsoluteQuantity via l'ajustement de stock (voir
  // Lot 4) — un produit fraîchement créé démarre à 0, invendable en caisse.
  await page.request.post(`${API_URL}/api/v1/stock/adjustments`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      productId: body.product.id,
      type: "ADJUSTMENT_IN",
      quantity: 100,
      reason: "Stock initial E2E",
    },
  });

  return { id: body.product.id, name: body.product.name };
}
