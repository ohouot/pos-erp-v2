import { test, expect } from "@playwright/test";
import { registerNewEstablishment } from "./helpers.js";

test.describe("Connexion", () => {
  test("une route protégée redirige vers /login sans session", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });

  test("inscription puis connexion/déconnexion/reconnexion", async ({
    page,
  }) => {
    const user = await registerNewEstablishment(page);

    // L'inscription connecte déjà l'utilisateur (voir RegisterForm) —
    // vérifie que le tableau de bord affiche bien son nom.
    await expect(
      page.getByText(`${user.firstName} ${user.lastName}`),
    ).toBeVisible();

    // Déconnexion : retour à /login, route protégée à nouveau inaccessible.
    await page
      .getByRole("button", { name: /déconnexion|se déconnecter/i })
      .click();
    await expect(page).toHaveURL(/\/login/);
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);

    // Reconnexion avec les identifiants créés à l'inscription.
    await page.goto("/login");
    await page.fill("#email", user.email);
    await page.fill("#password", user.password);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await page.waitForURL("/");
    await expect(
      page.getByText(`${user.firstName} ${user.lastName}`),
    ).toBeVisible();
  });

  test("mauvais mot de passe rejeté avec un message clair", async ({
    page,
  }) => {
    const user = await registerNewEstablishment(page);
    // signOut({ callbackUrl: "/login" }) redirige déjà vers /login lui-même
    // (voir LogoutButton) — un page.goto("/login") immédiatement après le
    // clic course-condition avec cette redirection en cours et peut laisser
    // le navigateur sur le tableau de bord. Attendre l'URL réelle avant de
    // continuer, sans re-naviguer.
    await page
      .getByRole("button", { name: /déconnexion|se déconnecter/i })
      .click();
    await page.waitForURL(/\/login/);
    await page.fill("#email", user.email);
    await page.fill("#password", "MauvaisMotDePasse123!");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(
      page.getByText("Email ou mot de passe incorrect."),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });
});
