"use client";

import { useCallback, useEffect, useState } from "react";
import { useNestApi } from "@/hooks/useNestApi";

interface ExpenseCategory {
  id: string;
  name: string;
}

export function ExpenseCategoriesPanel({ canManage }: { canManage: boolean }) {
  const { authFetch } = useNestApi();
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await authFetch("/expense-categories");
    if (!res.ok) return;
    const data = (await res.json()) as { expenseCategories: ExpenseCategory[] };
    setCategories(data.expenseCategories);
  }, [authFetch]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const res = await authFetch("/expense-categories", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.message ?? "Échec de la création");
      return;
    }
    setName("");
    setIsCreating(false);
    load();
  }

  async function handleUpdate(id: string) {
    setError(null);
    const res = await authFetch(`/expense-categories/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.message ?? "Échec de l'enregistrement");
      return;
    }
    setEditingId(null);
    setName("");
    load();
  }

  async function handleDelete(id: string) {
    await authFetch(`/expense-categories/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="flex flex-col gap-4">
      {canManage && (
        <div>
          {!isCreating ? (
            <button
              onClick={() => {
                setIsCreating(true);
                setName("");
              }}
              className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white"
            >
              Nouvelle catégorie
            </button>
          ) : (
            <form
              onSubmit={handleCreate}
              className="flex items-end gap-3 rounded border border-neutral-300 p-3"
            >
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">Nom</label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded border border-neutral-300 px-2 py-1 text-sm"
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
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
      )}

      <ul className="flex flex-col divide-y divide-neutral-200 rounded border border-neutral-200">
        {categories.map((c) => (
          <li key={c.id} className="flex items-center gap-3 px-3 py-2 text-sm">
            {editingId === c.id ? (
              <>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded border border-neutral-300 px-2 py-1 text-sm"
                />
                <button
                  onClick={() => handleUpdate(c.id)}
                  className="text-xs text-green-700 hover:underline"
                >
                  Enregistrer
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="text-xs text-neutral-500 hover:underline"
                >
                  Annuler
                </button>
              </>
            ) : (
              <>
                <span>{c.name}</span>
                {canManage && (
                  <div className="ml-auto flex gap-3">
                    <button
                      onClick={() => {
                        setEditingId(c.id);
                        setName(c.name);
                      }}
                      className="text-xs text-neutral-600 hover:underline"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Supprimer
                    </button>
                  </div>
                )}
              </>
            )}
          </li>
        ))}
        {categories.length === 0 && (
          <li className="px-3 py-4 text-center text-sm text-neutral-500">
            Aucune catégorie.
          </li>
        )}
      </ul>
    </div>
  );
}
