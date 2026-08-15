import * as bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import {
  ALL_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  SYSTEM_ROLES,
} from "@pos-erp-v2/shared";

const prisma = new PrismaClient();

// Unités système de base, communes à tous les établissements.
const SYSTEM_UNITS: Array<{ name: string; symbol: string }> = [
  { name: "Pièce", symbol: "pc" },
  { name: "Kilogramme", symbol: "kg" },
  { name: "Gramme", symbol: "g" },
  { name: "Litre", symbol: "L" },
  { name: "Centilitre", symbol: "cl" },
  { name: "Bouteille", symbol: "bout." },
  { name: "Canette", symbol: "can." },
  { name: "Carton", symbol: "cart." },
  { name: "Casier", symbol: "cais." },
];

async function main(): Promise<void> {
  console.log("Seed : permissions...");
  for (const key of ALL_PERMISSIONS) {
    const [module] = key.split(":");
    await prisma.permission.upsert({
      where: { key },
      update: {},
      create: { key, module: module ?? "misc" },
    });
  }

  console.log("Seed : rôles système...");
  for (const roleName of SYSTEM_ROLES) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName, isSystem: true },
    });

    const permissionKeys = DEFAULT_ROLE_PERMISSIONS[roleName] ?? [];
    const permissions = await prisma.permission.findMany({
      where: { key: { in: permissionKeys } },
    });

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: permissions.map((p) => ({ roleId: role.id, permissionId: p.id })),
      skipDuplicates: true,
    });
  }

  console.log("Seed : unités système...");
  for (const unit of SYSTEM_UNITS) {
    // La contrainte unique (establishmentId, name) ne peut pas servir de clé
    // d'upsert ici : Postgres traite chaque NULL comme distinct, donc on
    // vérifie l'existence manuellement plutôt que d'utiliser upsert().
    const existing = await prisma.unit.findFirst({
      where: { name: unit.name, establishmentId: null },
    });
    if (!existing) {
      await prisma.unit.create({
        data: { name: unit.name, symbol: unit.symbol, establishmentId: null },
      });
    }
  }

  console.log("Seed : compte Super Administrateur...");
  const superAdminEmail =
    process.env.SEED_SUPER_ADMIN_EMAIL ?? "admin@pos-erp-v2.local";
  const superAdminPassword =
    process.env.SEED_SUPER_ADMIN_PASSWORD ?? "ChangeMe123!";
  const passwordHash = await bcrypt.hash(superAdminPassword, 12);

  await prisma.user.upsert({
    where: { email: superAdminEmail },
    update: {},
    create: {
      email: superAdminEmail,
      passwordHash,
      firstName: "Super",
      lastName: "Admin",
      isSuperAdmin: true,
    },
  });

  console.log(
    `Seed terminé. Connexion : ${superAdminEmail} / ${superAdminPassword} (à changer immédiatement).`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
