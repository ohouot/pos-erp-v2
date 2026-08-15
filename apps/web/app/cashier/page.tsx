"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useNestApi } from "@/hooks/useNestApi";

interface CashMovement {
  id: string;
  type: "DEPOSIT" | "WITHDRAWAL";
  amount: string;
  reason: string | null;
  createdAt: string;
}

interface CashSession {
  id: string;
  openingBalance: string;
  closingBalanceExpected: string | null;
  closingBalanceCounted: string | null;
  difference: string | null;
  status: "OPEN" | "CLOSED";
  closureNumber: number | null;
  openedAt: string;
  closedAt: string | null;
  movements: CashMovement[];
  summary: {
    totalSales: string;
    orderCount: number;
    totalSalesByMethod: Record<string, string>;
    totalDeposits: string;
    totalWithdrawals: string;
    invoiceNumberRange: { first: string; last: string } | null;
  } | null;
}

export default function CashierPage() {
  const { data: session } = useSession();
  const { authFetch } = useNestApi();

  const [current, setCurrent] = useState<CashSession | null | undefined>(
    undefined,
  );
  const [openingBalance, setOpeningBalance] = useState("0");
  const [movementForm, setMovementForm] = useState({ amount: "", reason: "" });
  const [closingCounted, setClosingCounted] = useState("");
  const [showClose, setShowClose] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastClosed, setLastClosed] = useState<CashSession | null>(null);

  const canOpen = session?.user.permissions.includes("cashier:open") ?? false;
  const canDeposit =
    session?.user.permissions.includes("cashier:deposit") ?? false;
  const canWithdraw =
    session?.user.permissions.includes("cashier:withdraw") ?? false;
  const canClose = session?.user.permissions.includes("cashier:close") ?? false;

  const load = useCallback(async () => {
    const res = await authFetch("/cashier/sessions/current");
    if (!res.ok) return;
    const data = (await res.json()) as { session: CashSession | null };
    setCurrent(data.session);
  }, [authFetch]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleOpen(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const res = await authFetch("/cashier/sessions", {
      method: "POST",
      body: JSON.stringify({ openingBalance: Number(openingBalance) }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.message ?? "Échec de l'ouverture");
      return;
    }
    load();
  }

  async function handleMovement(type: "deposit" | "withdraw") {
    if (!current) return;
    setError(null);
    const res = await authFetch(`/cashier/sessions/${current.id}/${type}`, {
      method: "POST",
      body: JSON.stringify({
        amount: Number(movementForm.amount),
        reason: movementForm.reason || undefined,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.message ?? "Échec");
      return;
    }
    setMovementForm({ amount: "", reason: "" });
    load();
  }

  async function handleClose(event: React.FormEvent) {
    event.preventDefault();
    if (!current) return;
    setError(null);
    const res = await authFetch(`/cashier/sessions/${current.id}/close`, {
      method: "POST",
      body: JSON.stringify({ closingBalanceCounted: Number(closingCounted) }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.message ?? "Échec de la clôture");
      return;
    }
    const data = (await res.json()) as { session: CashSession };
    setLastClosed(data.session);
    setShowClose(false);
    setClosingCounted("");
    load();
  }

  return (
    <main className="flex min-h-screen flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Session de caisse</h1>
        <Link href="/" className="text-sm text-neutral-500 hover:underline">
          ← Tableau de bord
        </Link>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {current === undefined && (
        <p className="text-sm text-neutral-500">Chargement...</p>
      )}

      {current === null && (
        <div className="flex flex-col gap-4 rounded border border-neutral-300 p-6">
          <p className="text-sm text-neutral-600">
            Aucune session de caisse ouverte.
          </p>
          {canOpen && (
            <form onSubmit={handleOpen} className="flex items-end gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="openingBalance" className="text-xs font-medium">
                  Fonds de caisse initial
                </label>
                <input
                  id="openingBalance"
                  type="number"
                  min="0"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  className="w-40 rounded border border-neutral-300 px-3 py-2 text-sm"
                />
              </div>
              <button
                type="submit"
                className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
              >
                Ouvrir la caisse
              </button>
            </form>
          )}
        </div>
      )}

      {current && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4 rounded border border-green-300 bg-green-50 p-4 text-sm sm:grid-cols-4">
            <div>
              <p className="text-xs text-neutral-500">Ouverte le</p>
              <p className="font-medium">
                {new Date(current.openedAt).toLocaleString("fr-FR")}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">Fonds initial</p>
              <p className="font-medium">{current.openingBalance}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">Dépôts</p>
              <p className="font-medium">
                {current.movements
                  .filter((m) => m.type === "DEPOSIT")
                  .reduce((s, m) => s + Number(m.amount), 0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">Retraits</p>
              <p className="font-medium">
                {current.movements
                  .filter((m) => m.type === "WITHDRAWAL")
                  .reduce((s, m) => s + Number(m.amount), 0)}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            {canDeposit && (
              <div className="flex items-end gap-2">
                <input
                  type="number"
                  placeholder="Montant"
                  value={movementForm.amount}
                  onChange={(e) =>
                    setMovementForm((f) => ({ ...f, amount: e.target.value }))
                  }
                  className="w-28 rounded border border-neutral-300 px-2 py-1.5 text-sm"
                />
                <input
                  placeholder="Motif"
                  value={movementForm.reason}
                  onChange={(e) =>
                    setMovementForm((f) => ({ ...f, reason: e.target.value }))
                  }
                  className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
                />
                <button
                  onClick={() => handleMovement("deposit")}
                  className="rounded border border-green-400 px-3 py-1.5 text-sm text-green-700 hover:bg-green-50"
                >
                  Dépôt
                </button>
                {canWithdraw && (
                  <button
                    onClick={() => handleMovement("withdraw")}
                    className="rounded border border-red-400 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
                  >
                    Retrait
                  </button>
                )}
              </div>
            )}
            {canClose && (
              <button
                onClick={() => setShowClose((v) => !v)}
                className="ml-auto rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
              >
                Clôturer la caisse
              </button>
            )}
          </div>

          {showClose && (
            <form
              onSubmit={handleClose}
              className="flex items-end gap-3 rounded border border-neutral-300 p-4"
            >
              <div className="flex flex-col gap-1">
                <label htmlFor="closingCounted" className="text-xs font-medium">
                  Montant compté en caisse
                </label>
                <input
                  id="closingCounted"
                  type="number"
                  min="0"
                  required
                  value={closingCounted}
                  onChange={(e) => setClosingCounted(e.target.value)}
                  className="w-40 rounded border border-neutral-300 px-3 py-2 text-sm"
                />
              </div>
              <button
                type="submit"
                className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
              >
                Confirmer la clôture
              </button>
            </form>
          )}

          <div className="overflow-x-auto rounded border border-neutral-200">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500">
                <tr>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Montant</th>
                  <th className="px-3 py-2">Motif</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {current.movements.map((m) => (
                  <tr key={m.id}>
                    <td className="px-3 py-2">
                      {new Date(m.createdAt).toLocaleString("fr-FR")}
                    </td>
                    <td className="px-3 py-2">
                      {m.type === "DEPOSIT" ? "Dépôt" : "Retrait"}
                    </td>
                    <td className="px-3 py-2">{m.amount}</td>
                    <td className="px-3 py-2 text-neutral-500">
                      {m.reason ?? "—"}
                    </td>
                  </tr>
                ))}
                {current.movements.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-4 text-center text-neutral-500"
                    >
                      Aucun mouvement.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {lastClosed && (
        <div className="flex flex-col gap-2 rounded border border-neutral-300 bg-neutral-50 p-4 text-sm">
          <h2 className="font-semibold">
            Clôture n°{lastClosed.closureNumber}
          </h2>
          <p>Solde théorique : {lastClosed.closingBalanceExpected}</p>
          <p>Solde compté : {lastClosed.closingBalanceCounted}</p>
          <p
            className={
              Number(lastClosed.difference) !== 0
                ? "font-medium text-amber-700"
                : ""
            }
          >
            Écart : {lastClosed.difference}
          </p>
          {lastClosed.summary && (
            <>
              <p>
                Total des ventes : {lastClosed.summary.totalSales} (
                {lastClosed.summary.orderCount} tickets)
              </p>
              <ul className="list-disc pl-5">
                {Object.entries(lastClosed.summary.totalSalesByMethod).map(
                  ([code, amount]) => (
                    <li key={code}>
                      {code} : {amount}
                    </li>
                  ),
                )}
              </ul>
            </>
          )}
        </div>
      )}
    </main>
  );
}
