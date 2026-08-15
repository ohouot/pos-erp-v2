import { test, expect } from "@playwright/test";
import {
  registerNewEstablishment,
  getAccessToken,
  createTestProduct,
} from "./helpers.js";

test("vente complète : caisse ouverte, ajout au panier, encaissement", async ({
  page,
}) => {
  await registerNewEstablishment(page);
  const token = await getAccessToken(page);
  const product = await createTestProduct(page, token, {
    name: `Coca E2E ${Date.now()}`,
    salePrice: 750,
  });

  // Une session de caisse ouverte est requise avant tout encaissement (voir
  // PaymentsService.createPayment côté API) — ouverte ici via le vrai
  // formulaire, pas contournée par API.
  await page.goto("/cashier");
  await page.getByLabel("Fonds de caisse initial").fill("10000");
  await page.getByRole("button", { name: "Ouvrir la caisse" }).click();
  await expect(page.getByText("Fonds initial")).toBeVisible();

  await page.goto("/pos");
  await page.getByPlaceholder("Rechercher un produit...").fill(product.name);
  await page.getByText(product.name).first().click();

  // Le panier affiche la ligne ajoutée avant l'encaissement.
  await expect(page.locator("text=Panier vide")).toHaveCount(0);

  await page.getByRole("button", { name: /Encaisser/ }).click();

  await expect(page.getByText("Vente enregistrée avec succès.")).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.getByText(/^Commande CMD-/)).toBeVisible();
});
