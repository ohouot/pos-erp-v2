import { defineConfig, devices } from "@playwright/test";

// Cible les serveurs de dev déjà lancés (web:3100, api:4100) — voir
// package.json racine "dev"/"dev:web"/"dev:api". Pas de webServer géré ici :
// en CI comme en local, on suppose la stack déjà démarrée (docker compose +
// pnpm dev), pour rester cohérent avec le reste des vérifications manuelles
// de ce dépôt (curl contre l'API réelle, jamais de mocks).
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  // Un seul worker : contre le serveur Next.js en mode dev (pas un build de
  // production), chaque route se compile à la première requête — plusieurs
  // workers en parallèle se disputent ce compile-à-la-demande et déclenchent
  // des timeouts qui n'ont rien à voir avec l'application elle-même
  // (reproduit et confirmé : mêmes tests, échecs différents à chaque run
  // avec 3 workers, tous liés à des pages "encore en compilation").
  workers: 1,
  timeout: 60_000,
  // Le timeout par défaut de chaque assertion web-first (5s) est trop court
  // face au compile-à-la-demande de Next.js en mode dev sur une route
  // visitée pour la première fois dans le process de test — confirmé
  // reproductible sur /cashier ("Chargement..." encore affiché à 5s).
  expect: { timeout: 15_000 },
  retries: 0,
  reporter: [["list"]],
  use: {
    // "localhost", pas "127.0.0.1" : c'est l'origine que CLIENT_URL autorise
    // côté CORS de l'API (voir apps/api/.env) — une page chargée sous une
    // origine différente (127.0.0.1) voit TOUS ses appels fetch() rejetés
    // par la politique CORS, aucun rapport avec la résolution DNS. Les
    // appels API directs de mise en place (page.request, côté Node — voir
    // helpers.ts) ne sont eux pas soumis au CORS et utilisent 127.0.0.1
    // séparément pour éviter le souci de résolution IPv6 de "localhost".
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
