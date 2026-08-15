"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useNestApi } from "@/hooks/useNestApi";

interface Session {
  id: string;
  status: "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  notes: string | null;
  startedAt: string;
  completedAt: string | null;
}

export default function InventoryPage() {
  const { data: session } = useSession();
  const { authFetch } = useNestApi();
  const router = useRouter();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [isStarting, setIsStarting] = useState(false);

  const canStart =
    session?.user.permissions.includes("inventory:session:start") ?? false;

  const load = useCallback(async () => {
    const res = await authFetch("/inventory/sessions");
    if (!res.ok) return;
    const data = (await res.json()) as { sessions: Session[] };
    setSessions(data.sessions);
  }, [authFetch]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleStart() {
    setIsStarting(true);
    const res = await authFetch("/inventory/sessions", {
      method: "POST",
      body: JSON.stringify({}),
    });
    setIsStarting(false);
    if (!res.ok) return;
    const data = (await res.json()) as { session: Session };
    router.push(`/inventory/${data.session.id}`);
  }

  const statusLabel: Record<Session["status"], string> = {
    IN_PROGRESS: "En cours",
    COMPLETED: "Terminé",
    CANCELLED: "Annulé",
  };

  return (
    <main className="flex min-h-screen flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Sessions d&apos;inventaire</h1>
        <Link href="/" className="text-sm text-neutral-500 hover:underline">
          ← Tableau de bord
        </Link>
      </div>

      {canStart && (
        <button
          onClick={handleStart}
          disabled={isStarting}
          className="w-fit rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {isStarting ? "Démarrage..." : "Démarrer une session"}
        </button>
      )}

      <div className="overflow-x-auto rounded border border-neutral-200">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-3 py-2">Démarrée le</th>
              <th className="px-3 py-2">Statut</th>
              <th className="px-3 py-2">Terminée le</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {sessions.map((s) => (
              <tr key={s.id}>
                <td className="px-3 py-2">
                  {new Date(s.startedAt).toLocaleString("fr-FR")}
                </td>
                <td className="px-3 py-2">{statusLabel[s.status]}</td>
                <td className="px-3 py-2">
                  {s.completedAt
                    ? new Date(s.completedAt).toLocaleString("fr-FR")
                    : "—"}
                </td>
                <td className="px-3 py-2 text-right">
                  <Link
                    href={`/inventory/${s.id}`}
                    className="text-xs text-neutral-700 hover:underline"
                  >
                    Ouvrir
                  </Link>
                </td>
              </tr>
            ))}
            {sessions.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-3 py-6 text-center text-neutral-500"
                >
                  Aucune session d&apos;inventaire.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
