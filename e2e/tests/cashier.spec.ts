import { test, expect } from "@playwright/test";
import { registerNewEstablishment } from "./helpers.js";

test("clôture de caisse : ouverture, dépôt, clôture avec écart affiché", async ({
  page,
}) => {
  await registerNewEstablishment(page);

  await page.goto("/cashier");
  await expect(
    page.getByText("Aucune session de caisse ouverte."),
  ).toBeVisible();

  await page.getByLabel("Fonds de caisse initial").fill("5000");
  await page.getByRole("button", { name: "Ouvrir la caisse" }).click();
  await expect(page.getByText("Fonds initial")).toBeVisible();
  await expect(page.getByText("5000")).toBeVisible();

  // Un dépôt en cours de session avant la clôture.
  await page.getByPlaceholder("Montant").fill("2000");
  await page.getByPlaceholder("Motif").fill("Appoint E2E");
  await page.getByRole("button", { name: "Dépôt" }).click();
  await expect(page.getByText("Appoint E2E")).toBeVisible();

  // Clôture avec un montant compté volontairement différent du théorique
  // (5000 + 2000 = 7000) pour vérifier que l'écart est bien affiché plutôt
  // que silencieusement ignoré (voir cashier.service.closeSession côté API).
  await page.getByRole("button", { name: "Clôturer la caisse" }).click();
  await page.getByLabel("Montant compté en caisse").fill("6900");
  await page.getByRole("button", { name: "Confirmer la clôture" }).click();

  await expect(page.getByText(/^Clôture n°/)).toBeVisible();
  await expect(page.getByText("Solde théorique : 7000")).toBeVisible();
  await expect(page.getByText("Solde compté : 6900")).toBeVisible();
  await expect(page.getByText("Écart : -100")).toBeVisible();

  // La session redevient fermée : le formulaire d'ouverture réapparaît.
  await expect(
    page.getByText("Aucune session de caisse ouverte."),
  ).toBeVisible();
});
