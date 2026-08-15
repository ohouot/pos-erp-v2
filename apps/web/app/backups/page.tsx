"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useNestApi } from "@/hooks/useNestApi";

interface Backup {
  filename: string;
  size: number;
  createdAt: string;
}

const CONFIRM_WORD = "RESTAURER";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export default function BackupsPage() {
  const { data: session } = useSession();
  const { authFetch } = useNestApi();

  const [backups, setBackups] = useState<Backup[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [restoringFilename, setRestoringFilename] = useState<string | null>(
    null,
  );
  const [confirmText, setConfirmText] = useState("");
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSuperAdmin = session?.user.isSuperAdmin ?? false;

  const load = useCallback(async () => {
    const res = await authFetch("/backups");
    if (!res.ok) return;
    const data = (await res.json()) as { backups: Backup[] };
    setBackups(data.backups);
  }, [authFetch]);

  useEffect(() => {
    if (isSuperAdmin) load();
  }, [isSuperAdmin, load]);

  async function handleCreate() {
    setIsCreating(true);
    setError(null);
    const res = await authFetch("/backups", { method: "POST" });
    setIsCreating(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.message ?? "Échec de la sauvegarde");
      return;
    }
    load();
  }

  async function handleDownload(filename: string) {
    const res = await authFetch(`/backups/${filename}/download`);
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleDelete(filename: string) {
    await authFetch(`/backups/${filename}`, { method: "DELETE" });
    load();
  }

  async function handleRestore(filename: string) {
    setIsRestoring(true);
    setError(null);
    const res = await authFetch(`/backups/${filename}/restore`, {
      method: "POST",
      body: JSON.stringify({ confirm: true }),
    });
    setIsRestoring(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.message ?? "Échec de la restauration");
      return;
    }
    setRestoringFilename(null);
    setConfirmText("");
    load();
  }

  if (!isSuperAdmin) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-lg font-semibold">Accès refusé</p>
        <p className="text-sm text-neutral-500">
          Réservé au Super Administrateur.
        </p>
        <Link href="/" className="text-sm text-neutral-500 hover:underline">
          ← Tableau de bord
        </Link>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Sauvegardes</h1>
        <Link href="/" className="text-sm text-neutral-500 hover:underline">
          ← Tableau de bord
        </Link>
      </div>

      <div className="rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Une sauvegarde automatique planifiée tourne en arrière-plan. La
        restauration remplace intégralement les données actuelles par celles de
        la sauvegarde choisie — action irréversible.
      </div>

      <div>
        <button
          onClick={handleCreate}
          disabled={isCreating}
          className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {isCreating ? "Sauvegarde en cours..." : "Nouvelle sauvegarde"}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded border border-neutral-200">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-3 py-2">Fichier</th>
              <th className="px-3 py-2">Taille</th>
              <th className="px-3 py-2">Créée le</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {backups.map((b) => (
              <tr key={b.filename}>
                <td className="px-3 py-2 font-mono text-xs">{b.filename}</td>
                <td className="px-3 py-2">{formatSize(b.size)}</td>
                <td className="px-3 py-2">
                  {new Date(b.createdAt).toLocaleString("fr-FR")}
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => handleDownload(b.filename)}
                      className="text-xs text-neutral-600 hover:underline"
                    >
                      Télécharger
                    </button>
                    <button
                      onClick={() => {
                        setRestoringFilename(b.filename);
                        setConfirmText("");
                        setError(null);
                      }}
                      className="text-xs text-amber-700 hover:underline"
                    >
                      Restaurer
                    </button>
                    <button
                      onClick={() => handleDelete(b.filename)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Supprimer
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {backups.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-3 py-6 text-center text-neutral-500"
                >
                  Aucune sauvegarde pour l&apos;instant.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {restoringFilename && (
        <div className="rounded border border-red-300 bg-red-50 p-4 text-sm">
          <p className="font-medium text-red-900">
            Restaurer <span className="font-mono">{restoringFilename}</span> ?
          </p>
          <p className="mt-1 text-red-800">
            Cette action remplace intégralement la base de données actuelle.
            Tapez <strong>{CONFIRM_WORD}</strong> pour confirmer.
          </p>
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="mt-2 w-48 rounded border border-red-300 px-2 py-1.5 text-sm"
          />
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => handleRestore(restoringFilename)}
              disabled={confirmText !== CONFIRM_WORD || isRestoring}
              className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {isRestoring ? "Restauration..." : "Restaurer définitivement"}
            </button>
            <button
              onClick={() => setRestoringFilename(null)}
              className="rounded border border-neutral-300 px-4 py-2 text-sm"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
