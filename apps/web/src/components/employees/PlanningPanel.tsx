"use client";

import { useCallback, useEffect, useState } from "react";
import { useNestApi } from "@/hooks/useNestApi";

interface Employee {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
}

interface WorkShift {
  id: string;
  employeeId: string;
  employee: { id: string; firstName: string; lastName: string } | null;
  startTime: string;
  endTime: string;
  role: string | null;
}

interface DraftForm {
  employeeId: string;
  startTime: string;
  endTime: string;
  role: string;
}

const EMPTY_FORM: DraftForm = {
  employeeId: "",
  startTime: "",
  endTime: "",
  role: "",
};
const SELECT_CLASSNAME = "rounded border border-neutral-300 px-2 py-1 text-sm";

export function PlanningPanel({ canUpdate }: { canUpdate: boolean }) {
  const { authFetch } = useNestApi();

  const [shifts, setShifts] = useState<WorkShift[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [form, setForm] = useState<DraftForm>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const loadShifts = useCallback(async () => {
    const res = await authFetch("/work-shifts");
    if (!res.ok) return;
    const data = (await res.json()) as { shifts: WorkShift[] };
    setShifts(data.shifts);
  }, [authFetch]);

  useEffect(() => {
    loadShifts();
    authFetch("/employees")
      .then((res) => res.json())
      .then((data: { employees: Employee[] }) => setEmployees(data.employees))
      .catch(() => setEmployees([]));
  }, [loadShifts, authFetch]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    // employeeId envoyé ici est le userId du compte (voir Employee.userId) —
    // pas le Employee.id de la fiche RH, cohérent avec le contrat de
    // l'endpoint /work-shifts.
    const res = await authFetch("/work-shifts", {
      method: "POST",
      body: JSON.stringify({
        employeeId: form.employeeId,
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
        role: form.role || undefined,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setFormError(
        Array.isArray(body?.message)
          ? body.message.join(", ")
          : (body?.message ?? "Échec de la création"),
      );
      return;
    }
    setForm(EMPTY_FORM);
    loadShifts();
  }

  async function handleDelete(id: string) {
    await authFetch(`/work-shifts/${id}`, { method: "DELETE" });
    loadShifts();
  }

  return (
    <div className="flex flex-col gap-4">
      {canUpdate && (
        <form
          onSubmit={handleCreate}
          className="flex flex-wrap items-end gap-3 rounded border border-neutral-300 p-3"
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium">Employé</label>
            <select
              required
              value={form.employeeId}
              onChange={(e) =>
                setForm((f) => ({ ...f, employeeId: e.target.value }))
              }
              className={SELECT_CLASSNAME}
            >
              <option value="">—</option>
              {employees.map((e) => (
                <option key={e.userId} value={e.userId}>
                  {e.firstName} {e.lastName}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium">Début</label>
            <input
              type="datetime-local"
              required
              value={form.startTime}
              onChange={(e) =>
                setForm((f) => ({ ...f, startTime: e.target.value }))
              }
              className="rounded border border-neutral-300 px-2 py-1 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium">Fin</label>
            <input
              type="datetime-local"
              required
              value={form.endTime}
              onChange={(e) =>
                setForm((f) => ({ ...f, endTime: e.target.value }))
              }
              className="rounded border border-neutral-300 px-2 py-1 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium">Poste occupé</label>
            <input
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              placeholder="Caisse, Salle..."
              className="rounded border border-neutral-300 px-2 py-1 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white"
          >
            Planifier
          </button>
          {formError && (
            <p className="w-full text-sm text-red-600">{formError}</p>
          )}
        </form>
      )}

      <div className="overflow-x-auto rounded border border-neutral-200">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-3 py-2">Employé</th>
              <th className="px-3 py-2">Début</th>
              <th className="px-3 py-2">Fin</th>
              <th className="px-3 py-2">Poste</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {shifts.map((s) => (
              <tr key={s.id}>
                <td className="px-3 py-2 font-medium">
                  {s.employee
                    ? `${s.employee.firstName} ${s.employee.lastName}`
                    : "—"}
                </td>
                <td className="px-3 py-2">
                  {new Date(s.startTime).toLocaleString("fr-FR")}
                </td>
                <td className="px-3 py-2">
                  {new Date(s.endTime).toLocaleString("fr-FR")}
                </td>
                <td className="px-3 py-2">{s.role ?? "—"}</td>
                <td className="px-3 py-2 text-right">
                  {canUpdate && (
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Supprimer
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {shifts.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-6 text-center text-neutral-500"
                >
                  Aucun créneau planifié.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
