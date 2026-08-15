"use client";

import { useCallback, useEffect, useState } from "react";
import { useNestApi } from "@/hooks/useNestApi";

interface Unit {
  id: string;
  name: string;
  symbol: string;
  establishmentId: string | null;
}

export function UnitsPanel({ canManage }: { canManage: boolean }) {
  const { authFetch } = useNestApi();
  const [units, setUnits] = useState<Unit[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState({ name: "", symbol: "" });

  const load = useCallback(async () => {
    const res = await authFetch("/units");
    if (!res.ok) return;
    const data = (await res.json()) as { units: Unit[] };
    setUnits(data.units);
  }, [authFetch]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    await authFetch("/units", { method: "POST", body: JSON.stringify(form) });
    setForm({ name: "", symbol: "" });
    setIsCreating(false);
    load();
  }

  return (
    <div className="flex flex-col gap-4">
      {canManage && (
        <div>
          {!isCreating ? (
            <button
              onClick={() => setIsCreating(true)}
              className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white"
            >
              Nouvelle unité
            </button>
          ) : (
            <form
              onSubmit={handleCreate}
              className="flex flex-wrap items-end gap-3 rounded border border-neutral-300 p-3"
            >
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">Nom</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className="rounded border border-neutral-300 px-2 py-1 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">Symbole</label>
                <input
                  required
                  value={form.symbol}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, symbol: e.target.value }))
                  }
                  className="w-20 rounded border border-neutral-300 px-2 py-1 text-sm"
                />
              </div>
              <button
                type="submit"
                className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white"
              >
                Créer
              </button>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="text-sm text-neutral-500"
              >
                Annuler
              </button>
            </form>
          )}
        </div>
      )}

      <ul className="flex flex-col divide-y divide-neutral-200 rounded border border-neutral-200">
        {units.map((u) => (
          <li key={u.id} className="flex items-center gap-3 px-3 py-2 text-sm">
            <span>{u.name}</span>
            <span className="text-neutral-500">({u.symbol})</span>
            {u.establishmentId === null && (
              <span className="ml-auto rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">
                système
              </span>
            )}
          </li>
        ))}
        {units.length === 0 && (
          <li className="px-3 py-4 text-center text-sm text-neutral-500">
            Aucune unité.
          </li>
        )}
      </ul>
    </div>
  );
}
