-- Compléments caisse/ERP (Lot D) : colonnes purement additives, nullable ou
-- avec défaut — aucune migration de données nécessaire.

-- Category : couleur de tuile pour le filtre famille en caisse.
ALTER TABLE "categories" ADD COLUMN "color" TEXT;

-- User : PIN hashé pour l'autorisation d'action sensible (confirmation
-- d'identité, pas un nouveau niveau de permission).
ALTER TABLE "users" ADD COLUMN "pinCodeHash" TEXT;

-- Establishment : compteur atomique de numéro de file d'attente, remis à
-- zéro au changement de journée commerciale.
ALTER TABLE "establishments" ADD COLUMN "nextQueueNumber" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "queueNumberDate" TIMESTAMP(3);
