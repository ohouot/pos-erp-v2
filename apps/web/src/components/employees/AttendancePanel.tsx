"use client";

import { useCallback, useEffect, useState } from "react";
import { useNestApi } from "@/hooks/useNestApi";

interface AttendanceRow {
  id: string;
  employee: { id: string; firstName: string; lastName: string } | null;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  notes: string | null;
}

export function AttendancePanel({
  canReadHistory,
}: {
  canReadHistory: boolean;
}) {
  const { authFetch } = useNestApi();

  const [history, setHistory] = useState<AttendanceRow[]>([]);
  const [checkInError, setCheckInError] = useState<string | null>(null);
  const [checkInSuccess, setCheckInSuccess] = useState<string | null>(null);
  const [checkOutError, setCheckOutError] = useState<string | null>(null);
  const [checkOutSuccess, setCheckOutSuccess] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    if (!canReadHistory) return;
    const res = await authFetch("/attendance");
    if (!res.ok) return;
    const data = (await res.json()) as { attendance: AttendanceRow[] };
    setHistory(data.attendance);
  }, [authFetch, canReadHistory]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  async function handleCheckIn() {
    setCheckInError(null);
    setCheckInSuccess(null);
    const res = await authFetch("/attendance/check-in", {
      method: "POST",
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setCheckInError(body?.message ?? "Échec du pointage");
      return;
    }
    setCheckInSuccess("Arrivée enregistrée.");
    loadHistory();
  }

  async function handleCheckOut() {
    setCheckOutError(null);
    setCheckOutSuccess(null);
    const res = await authFetch("/attendance/check-out", {
      method: "POST",
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setCheckOutError(body?.message ?? "Échec du pointage");
      return;
    }
    setCheckOutSuccess("Départ enregistré.");
    loadHistory();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start gap-6 rounded border border-neutral-300 p-4">
        <div className="flex flex-col gap-2">
          <button
            onClick={handleCheckIn}
            className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
          >
            Pointer mon arrivée
          </button>
          {checkInError && (
            <p className="text-sm text-red-600">{checkInError}</p>
          )}
          {checkInSuccess && (
            <p className="text-sm text-green-700">{checkInSuccess}</p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <button
            onClick={handleCheckOut}
            className="rounded border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-100"
          >
            Pointer mon départ
          </button>
          {checkOutError && (
            <p className="text-sm text-red-600">{checkOutError}</p>
          )}
          {checkOutSuccess && (
            <p className="text-sm text-green-700">{checkOutSuccess}</p>
          )}
        </div>
      </div>

      {canReadHistory && (
        <div className="overflow-x-auto rounded border border-neutral-200">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500">
              <tr>
                <th className="px-3 py-2">Employé</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Arrivée</th>
                <th className="px-3 py-2">Départ</th>
                <th className="px-3 py-2">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {history.map((row) => (
                <tr key={row.id}>
                  <td className="px-3 py-2 font-medium">
                    {row.employee
                      ? `${row.employee.firstName} ${row.employee.lastName}`
                      : "—"}
                  </td>
                  <td className="px-3 py-2">
                    {new Date(row.date).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-3 py-2">
                    {row.checkIn
                      ? new Date(row.checkIn).toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </td>
                  <td className="px-3 py-2">
                    {row.checkOut
                      ? new Date(row.checkOut).toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </td>
                  <td className="px-3 py-2 text-neutral-500">
                    {row.notes ?? "—"}
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-6 text-center text-neutral-500"
                  >
                    Aucun pointage enregistré.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
