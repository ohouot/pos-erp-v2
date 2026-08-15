"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useNestApi } from "@/hooks/useNestApi";

interface BankAccount {
  id: string;
  name: string;
  currentBalance: string;
  isActive: boolean;
  movements: {
    id: string;
    type: "DEPOSIT" | "WITHDRAWAL";
    amount: string;
    reason: string | null;
    createdAt: string;
  }[];
}

export default function BankPage() {
  const { data: session } = useSession();
  const { authFetch } = useNestApi();

  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [movementForms, setMovementForms] = useState<
    Record<string, { amount: string; reason: string }>
  >({});
  const [error, setError] = useState<string | null>(null);

  const canCreate = session?.user.permissions.includes("bank:create") ?? false;
  const canDeposit =
    session?.user.permissions.includes("bank:deposit") ?? false;
  const canWithdraw =
    session?.user.permissions.includes("bank:withdraw") ?? false;

  const load = useCallback(async () => {
    const res = await authFetch("/bank/accounts");
    if (!res.ok) return;
    const data = (await res.json()) as { accounts: BankAccount[] };
    setAccounts(data.accounts);
  }, [authFetch]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    await authFetch("/bank/accounts", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    setName("");
    setShowForm(false);
    load();
  }

  function getForm(id: string) {
    return movementForms[id] ?? { amount: "", reason: "" };
  }

  async function handleMovement(id: string, type: "deposit" | "withdraw") {
    setError(null);
    const form = getForm(id);
    const res = await authFetch(`/bank/accounts/${id}/${type}`, {
      method: "POST",
      body: JSON.stringify({
        amount: Number(form.amount),
        reason: form.reason || undefined,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.message ?? "Échec");
      return;
    }
    setMovementForms((prev) => ({ ...prev, [id]: { amount: "", reason: "" } }));
    load();
  }

  return (
    <main className="flex min-h-screen flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Banque</h1>
        <Link href="/" className="text-sm text-neutral-500 hover:underline">
          ← Tableau de bord
        </Link>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {canCreate && (
        <div>
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white"
            >
              Nouveau compte
            </button>
          ) : (
            <form
              onSubmit={handleCreate}
              className="flex items-end gap-3 rounded border border-neutral-300 p-3"
            >
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">Nom du compte</label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
                />
              </div>
              <button
                type="submit"
                className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white"
              >
                Créer
              </button>
            </form>
          )}
        </div>
      )}

      <div className="flex flex-col gap-4">
        {accounts.map((acc) => (
          <div key={acc.id} className="rounded border border-neutral-200 p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{acc.name}</h2>
              <span className="text-lg font-bold">{acc.currentBalance}</span>
            </div>

            {(canDeposit || canWithdraw) && (
              <div className="mt-3 flex items-end gap-2">
                <input
                  type="number"
                  placeholder="Montant"
                  value={getForm(acc.id).amount}
                  onChange={(e) =>
                    setMovementForms((prev) => ({
                      ...prev,
                      [acc.id]: { ...getForm(acc.id), amount: e.target.value },
                    }))
                  }
                  className="w-28 rounded border border-neutral-300 px-2 py-1.5 text-sm"
                />
                <input
                  placeholder="Motif"
                  value={getForm(acc.id).reason}
                  onChange={(e) =>
                    setMovementForms((prev) => ({
                      ...prev,
                      [acc.id]: { ...getForm(acc.id), reason: e.target.value },
                    }))
                  }
                  className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
                />
                {canDeposit && (
                  <button
                    onClick={() => handleMovement(acc.id, "deposit")}
                    className="rounded border border-green-400 px-3 py-1.5 text-sm text-green-700 hover:bg-green-50"
                  >
                    Dépôt
                  </button>
                )}
                {canWithdraw && (
                  <button
                    onClick={() => handleMovement(acc.id, "withdraw")}
                    className="rounded border border-red-400 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
                  >
                    Retrait
                  </button>
                )}
              </div>
            )}

            <ul className="mt-3 flex flex-col divide-y divide-neutral-100 text-sm">
              {acc.movements.slice(0, 5).map((m) => (
                <li key={m.id} className="flex justify-between py-1">
                  <span>
                    {m.type === "DEPOSIT" ? "Dépôt" : "Retrait"}{" "}
                    {m.reason ? `— ${m.reason}` : ""}
                  </span>
                  <span>{m.amount}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {accounts.length === 0 && (
          <p className="text-sm text-neutral-500">Aucun compte bancaire.</p>
        )}
      </div>
    </main>
  );
}
