// Valide au démarrage les variables d'environnement critiques — échoue vite
// plutôt que de laisser l'API démarrer avec un secret JWT vide/trop court
// (voir apps/api/src/config/env.ts du projet de référence, en zod ; ici en
// validateur simple passé à ConfigModule.forRoot, class-validator n'étant
// pas adapté à la validation de process.env brut).
export function validateEnv(config: Record<string, unknown>) {
  const required = [
    "DATABASE_URL",
    "JWT_ACCESS_SECRET",
    "JWT_REFRESH_SECRET",
    "CLIENT_URL",
  ];
  const missing = required.filter((key) => !config[key]);
  if (missing.length > 0) {
    throw new Error(
      `Variables d'environnement manquantes : ${missing.join(", ")}`,
    );
  }

  for (const key of ["JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"]) {
    const value = String(config[key] ?? "");
    if (value.length < 32) {
      throw new Error(`${key} doit faire au moins 32 caractères`);
    }
  }

  return config;
}
