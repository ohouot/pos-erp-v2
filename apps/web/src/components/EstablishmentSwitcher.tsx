"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4100";

interface EstablishmentOption {
  id: string;
  name: string;
  myRole: string | null;
  isActive: boolean;
}

// Équivalent du EstablishmentSwitcher React Router : liste les établissements
// accessibles (tous, pour un Super Admin) et réémet un token scopé au choix
// via /establishments/:id/select — la session next-auth est ensuite
// rafraîchie via update() (voir jwt() côté src/lib/auth.ts, trigger "update"),
// sans reconnexion complète.
export function EstablishmentSwitcher() {
  const { data: session, update } = useSession();
  const [establishments, setEstablishments] = useState<EstablishmentOption[]>(
    [],
  );
  const [isSwitching, setIsSwitching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!session?.accessToken) return;
    fetch(`${API_URL}/api/v1/establishments`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    })
      .then((res) => res.json())
      .then((data: { establishments: EstablishmentOption[] }) =>
        setEstablishments(data.establishments),
      )
      .catch(() => setEstablishments([]));
  }, [session?.accessToken]);

  if (!session) return null;

  async function handleSelect(id: string) {
    if (!session?.accessToken) return;
    setIsSwitching(true);
    setIsOpen(false);
    try {
      const res = await fetch(`${API_URL}/api/v1/establishments/${id}/select`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        accessToken: string;
        establishment: { id: string };
      };
      await update({
        activeEstablishmentId: data.establishment.id,
        nestAccessToken: data.accessToken,
      });
    } finally {
      setIsSwitching(false);
    }
  }

  const activeName = establishments.find(
    (e) => e.id === session.activeEstablishmentId,
  )?.name;

  if (establishments.length <= 1 && session.activeEstablishmentId) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen((v) => !v)}
        disabled={isSwitching}
        className="rounded border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100 disabled:opacity-50"
      >
        {isSwitching
          ? "Changement..."
          : (activeName ?? "Choisir un établissement")}
      </button>
      {isOpen && (
        <ul className="absolute z-10 mt-1 w-64 rounded border border-neutral-300 bg-white shadow-lg">
          {establishments.map((est) => (
            <li key={est.id}>
              <button
                onClick={() => handleSelect(est.id)}
                disabled={!est.isActive}
                className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span>{est.name}</span>
                <span className="text-xs text-neutral-500">
                  {est.myRole ?? "—"}
                  {!est.isActive && " · désactivé"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
