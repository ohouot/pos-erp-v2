import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { LogoutButton } from "@/components/LogoutButton";
import { EstablishmentSwitcher } from "@/components/EstablishmentSwitcher";
import { NotificationBell } from "@/components/NotificationBell";
import { NAV_ITEMS } from "@/config/navigation";

async function getApiHealth() {
  const apiUrl = process.env.API_URL ?? "http://localhost:4100";
  try {
    const res = await fetch(`${apiUrl}/api/v1/health`, { cache: "no-store" });
    if (!res.ok) return { ok: false as const, error: `HTTP ${res.status}` };
    const data = (await res.json()) as { status: string; timestamp: string };
    return { ok: true as const, data };
  } catch (error) {
    return { ok: false as const, error: (error as Error).message };
  }
}

export default async function DashboardPage() {
  const [session, health] = await Promise.all([
    getServerSession(authOptions),
    getApiHealth(),
  ]);

  // Ne peut pas arriver : middleware.ts redirige déjà vers /login sans
  // session — filet de sécurité pour le typage de session.user ci-dessous.
  if (!session) return null;

  const visibleNavItems = NAV_ITEMS.filter((item) => {
    if (item.superAdminOnly && !session.user.isSuperAdmin) return false;
    return (
      !item.permission || session.user.permissions.includes(item.permission)
    );
  });

  return (
    <main className="flex min-h-screen flex-col gap-8 p-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {session.user.firstName} {session.user.lastName}
          </h1>
          <p className="text-sm text-neutral-500">{session.user.email}</p>
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell />
          <EstablishmentSwitcher />
          <LogoutButton />
        </div>
      </header>

      {!session.activeEstablishmentId && (
        <section className="rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Aucun établissement sélectionné — choisis-en un dans le menu en haut à
          droite pour accéder aux fonctionnalités qui en dépendent.
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-neutral-500">Navigation</h2>
        <nav className="flex flex-wrap gap-2">
          {visibleNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-neutral-500">
          Établissement actif
        </h2>
        <p className="text-sm">
          {session.activeEstablishmentId
            ? session.user.establishments.find(
                (e) => e.establishmentId === session.activeEstablishmentId,
              )?.establishmentName
            : "Aucun établissement sélectionné"}
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-neutral-500">API</h2>
        {health.ok ? (
          <p className="w-fit rounded bg-green-100 px-4 py-2 text-sm text-green-800">
            API OK — {health.data.status} ({health.data.timestamp})
          </p>
        ) : (
          <p className="w-fit rounded bg-red-100 px-4 py-2 text-sm text-red-800">
            API injoignable — {health.error}
          </p>
        )}
      </section>
    </main>
  );
}
