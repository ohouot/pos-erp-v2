-- Fiche produit enrichie : promotion de Product.location (texte libre)
-- vers une vraie relation Location, + nouveaux champs (prix plancher,
-- fournisseur préférentiel, visibilité bon de commande / boutique en
-- ligne). Bascule de données écrite à la main (comme la migration
-- PaymentMethod) : un `location` déjà utilisé sur un produit existant ne
-- doit jamais être perdu.

-- 1) Nouvelle table locations.
CREATE TABLE "locations" (
    "id" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "locations_establishmentId_name_key" ON "locations"("establishmentId", "name");

ALTER TABLE "locations" ADD CONSTRAINT "locations_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "establishments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 2) Une ligne locations par valeur distincte déjà utilisée dans
-- products.location, par établissement — aucune donnée existante perdue.
INSERT INTO "locations" ("id", "establishmentId", "name", "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, t."establishmentId", t."location", true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (SELECT DISTINCT "establishmentId", "location" FROM "products" WHERE "location" IS NOT NULL) t;

-- 3) Colonnes additives sur products.
ALTER TABLE "products" ADD COLUMN "minSalePrice" DECIMAL(12,2),
ADD COLUMN "locationId" TEXT,
ADD COLUMN "preferredSupplierId" TEXT,
ADD COLUMN "visibleOnPurchaseOrder" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "visibleOnlineStore" BOOLEAN NOT NULL DEFAULT false;

-- 4) Backfill locationId depuis la nouvelle table, puis suppression de
-- l'ancienne colonne texte libre.
UPDATE "products" p
SET "locationId" = l."id"
FROM "locations" l
WHERE l."establishmentId" = p."establishmentId"
  AND l."name" = p."location";

ALTER TABLE "products" DROP COLUMN "location";

-- 5) Contraintes FK.
ALTER TABLE "products" ADD CONSTRAINT "products_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "products" ADD CONSTRAINT "products_preferredSupplierId_fkey" FOREIGN KEY ("preferredSupplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
