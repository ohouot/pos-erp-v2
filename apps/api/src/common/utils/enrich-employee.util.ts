import type { PrismaService } from "../../prisma/prisma.service.js";

// WorkShift/Attendance référencent employeeId (= User.id, voir
// Employee.userId côté module employees) comme un simple scalaire, sans
// relation Prisma vers User — on résout les noms manuellement plutôt que
// d'ajouter une relation pour un besoin d'affichage uniquement.
export async function enrichWithEmployee<T extends { employeeId: string }>(
  prisma: PrismaService,
  rows: T[],
): Promise<
  (T & {
    employee: { id: string; firstName: string; lastName: string } | null;
  })[]
> {
  const ids = [...new Set(rows.map((row) => row.employeeId))];
  if (ids.length === 0) {
    return rows.map((row) => ({ ...row, employee: null }));
  }
  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, firstName: true, lastName: true },
  });
  const byId = new Map(users.map((user) => [user.id, user]));
  return rows.map((row) => ({
    ...row,
    employee: byId.get(row.employeeId) ?? null,
  }));
}
