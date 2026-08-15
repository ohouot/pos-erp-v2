"use client";

import { useCallback, useEffect, useState } from "react";
import { useNestApi } from "@/hooks/useNestApi";

interface Category {
  id: string;
  name: string;
  color: string | null;
  parentId: string | null;
}

export function CategoriesPanel({ canManage }: { canManage: boolean }) {
  const { authFetch } = useNestApi();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    color: "#94a3b8",
    parentId: "",
  });

  const load = useCallback(async () => {
    const res = await authFetch("/categories");
    if (!res.ok) return;
    const data = (await res.json()) as { categories: Category[] };
    setCategories(data.categories);
  }, [authFetch]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    await authFetch("/categories", {
      method: "POST",
      body: JSON.stringify({
        name: form.name,
        color: form.color,
        parentId: form.parentId || undefined,
      }),
    });
    setForm({ name: "", color: "#94a3b8", parentId: "" });
    setIsCreating(false);
    load();
  }

  async function handleColorChange(id: string, color: string) {
    await authFetch(`/categories/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ color }),
    });
    load();
  }

  async function handleDelete(id: string) {
    await authFetch(`/categories/${id}`, { method: "DELETE" });
    load();
  }

  const topLevel = categories.filter((c) => !c.parentId);

  return (
    <div className="flex flex-col gap-4">
      {canManage && (
        <div>
          {!isCreating ? (
            <button
              onClick={() => setIsCreating(true)}
              className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white"
            >
              Nouvelle catégorie
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
                <label className="text-xs font-medium">
                  Couleur de tuile (caisse)
                </label>
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, color: e.target.value }))
                  }
                  className="h-8 w-14 rounded border border-neutral-300"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">Parent</label>
                <select
                  value={form.parentId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, parentId: e.target.value }))
                  }
                  className="rounded border border-neutral-300 px-2 py-1 text-sm"
                >
                  <option value="">Aucune</option>
                  {topLevel.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
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
        {categories.map((c) => (
          <li key={c.id} className="flex items-center gap-3 px-3 py-2 text-sm">
            <input
              type="color"
              value={c.color ?? "#94a3b8"}
              onChange={(e) => handleColorChange(c.id, e.target.value)}
              className="h-6 w-6 rounded border border-neutral-300"
              disabled={!canManage}
            />
            <span>
              {c.parentId && "— "}
              {c.name}
            </span>
            {canManage && (
              <button
                onClick={() => handleDelete(c.id)}
                className="ml-auto text-xs text-red-600 hover:underline"
              >
                Supprimer
              </button>
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
