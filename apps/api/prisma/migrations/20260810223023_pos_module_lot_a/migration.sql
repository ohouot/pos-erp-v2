-- Lot A (module Caisse) : nouveaux champs Product/Order, et bascule de
-- Payment.method (enum figé) vers une table PaymentMethod configurable par
-- établissement. La bascule est une migration de données, pas juste
-- additive : chaque Payment existant doit retrouver la bonne ligne avant
-- que l'ancienne colonne/enum ne disparaisse — écrite à la main plutôt que
-- via `prisma migrate dev` (le mapping de données ne se déduit pas du
-- schéma seul).

-- 1) Colonnes additives (Product, Order) — sans impact sur les lignes
-- existantes, valeurs par défaut appliquées automatiquement.
ALTER TABLE "products" ADD COLUMN     "manageStock" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "visibleAtPos" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "orders" ADD COLUMN     "administratorId" TEXT,
ADD COLUMN     "globalDiscountType" "DiscountType",
ADD COLUMN     "globalDiscountValue" DECIMAL(12,2);

-- 2) Nouvelle table payment_methods.
CREATE TABLE "payment_methods" (
    "id" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payment_methods_establishmentId_code_key" ON "payment_methods"("establishmentId", "code");

ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "establishments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 3) Seed d'une ligne par établissement pour chaque valeur de l'ancien enum
-- (pour pouvoir reporter les Payment existants sans rien perdre) + WAVE en
-- plus, demandé comme moyen de paiement par défaut. gen_random_uuid() ici
-- uniquement (pas cuid, généré côté application par Prisma) : ce script SQL
-- n'a pas accès au générateur cuid applicatif — sans impact, l'id reste une
-- simple chaîne unique, tous les moyens de paiement créés depuis
-- l'application ensuite auront bien un cuid.
INSERT INTO "payment_methods" ("id", "establishmentId", "code", "label", "displayOrder", "isActive")
SELECT gen_random_uuid()::text, e."id", v.code, v.label, v.display_order, true
FROM "establishments" e
CROSS JOIN (VALUES
    ('CASH', 'Espèces', 0),
    ('WAVE', 'Wave', 1),
    ('MOBILE_MONEY_ORANGE', 'Orange Money', 2),
    ('MOBILE_MONEY_MTN', 'MTN Money', 3),
    ('MOBILE_MONEY_MOOV', 'Moov Money', 4),
    ('CARD', 'Carte bancaire', 5)
) AS v(code, label, display_order);

-- 4) Colonne de destination (nullable pour l'instant), backfill depuis
-- l'ancienne colonne enum method, puis bascule en NOT NULL.
ALTER TABLE "payments" ADD COLUMN "paymentMethodId" TEXT;

UPDATE "payments" p
SET "paymentMethodId" = pm."id"
FROM "payment_methods" pm
WHERE pm."establishmentId" = p."establishmentId"
  AND pm."code" = p."method"::text;

ALTER TABLE "payments" ALTER COLUMN "paymentMethodId" SET NOT NULL;

-- 5) Nettoyage : ancienne colonne/enum, plus rien n'en dépend.
ALTER TABLE "payments" DROP COLUMN "method";
DROP TYPE "PaymentMethod";

ALTER TABLE "payments" ADD CONSTRAINT "payments_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "payment_methods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
