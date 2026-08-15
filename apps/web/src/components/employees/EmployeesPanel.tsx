"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useNestApi } from "@/hooks/useNestApi";

interface Role {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  isActive: boolean;
  role: { id: string; name: string };
  vendorCode: string | null;
  position: string | null;
  salary: string | null;
  contractType: string | null;
  hireDate: string | null;
}

interface DraftForm {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  roleId: string;
  vendorCode: string;
  position: string;
  salary: string;
  contractType: string;
  hireDate: string;
}

const EMPTY_FORM: DraftForm = {
  email: "",
  firstName: "",
  lastName: "",
  phone: "",
  roleId: "",
  vendorCode: "",
  position: "",
  salary: "",
  contractType: "",
  hireDate: "",
};

interface ImportResult {
  summary: {
    createdCount: number;
    attachedCount: number;
    errors: { row: number; message: string }[];
  };
  createdAccounts: { email: string; temporaryPassword: string }[];
}

const SELECT_CLASSNAME = "rounded border border-neutral-300 px-2 py-1 text-sm";

export function EmployeesPanel({
  canCreate,
  canUpdate,
}: {
  canCreate: boolean;
  canUpdate: boolean;
}) {
  const { authFetch } = useNestApi();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<DraftForm>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [newTemporaryPassword, setNewTemporaryPassword] = useState<{
    email: string;
    password: string;
  } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const load = useCallback(async () => {
    const res = await authFetch("/employees");
    if (!res.ok) return;
    const data = (await res.json()) as { employees: Employee[] };
    setEmployees(data.employees);
  }, [authFetch]);

  useEffect(() => {
    load();
    authFetch("/roles")
      .then((res) => res.json())
      .then((data: { roles: Role[] }) => setRoles(data.roles))
      .catch(() => setRoles([]));
  }, [load, authFetch]);

  const filtered = employees.filter((e) => {
    if (!search) return true;
    const haystack =
      `${e.firstName} ${e.lastName} ${e.email} ${e.phone ?? ""} ${e.vendorCode ?? ""}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    const res = await authFetch("/employees", {
      method: "POST",
      body: JSON.stringify({
        email: form.email,
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone || undefined,
        roleId: form.roleId,
        vendorCode: form.vendorCode || undefined,
        position: form.position || undefined,
        salary: form.salary ? Number(form.salary) : undefined,
        contractType: form.contractType || undefined,
        hireDate: form.hireDate || undefined,
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
    const data = (await res.json()) as {
      employee: Employee;
      temporaryPassword: string | null;
    };
    if (data.temporaryPassword) {
      setNewTemporaryPassword({
        email: data.employee.email,
        password: data.temporaryPassword,
      });
    }
    setForm(EMPTY_FORM);
    setShowForm(false);
    load();
  }

  async function updateVendorCode(id: string, vendorCode: string) {
    await authFetch(`/employees/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ vendorCode: vendorCode || undefined }),
    });
    load();
  }

  async function updateRole(id: string, roleId: string) {
    await authFetch(`/employees/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ roleId }),
    });
    load();
  }

  async function toggleActive(e: Employee) {
    await authFetch(`/employees/${e.id}`, {
      method: "PATCH",
      body: JSON.stringify({ isActive: !e.isActive }),
    });
    load();
  }

  async function handleImportChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setIsImporting(true);
    setImportResult(null);
    const formData = new FormData();
    formData.append("file", file);
    const res = await authFetch("/employees/import", {
      method: "POST",
      body: formData,
    });
    setIsImporting(false);
    if (res.ok) {
      const result = (await res.json()) as ImportResult;
      setImportResult(result);
      load();
    }
  }

  async function handleExport() {
    const res = await authFetch("/employees/export");
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "employes.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          placeholder="Rechercher..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64 rounded border border-neutral-300 px-3 py-1.5 text-sm"
        />
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={handleExport}
            className="rounded border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100"
          >
            Exporter CSV
          </button>
          {canCreate && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleImportChange}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="rounded border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100 disabled:opacity-50"
              >
                {isImporting ? "Import..." : "Importer CSV"}
              </button>
              <button
                onClick={() => setShowForm((v) => !v)}
                className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white"
              >
                Nouvel employé
              </button>
            </>
          )}
        </div>
      </div>

      {newTemporaryPassword && (
        <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm">
          <p>
            Compte créé pour <strong>{newTemporaryPassword.email}</strong>. Mot
            de passe temporaire (à communiquer maintenant, il ne sera plus
            jamais affiché) :
          </p>
          <code className="mt-1 block rounded bg-white px-2 py-1 font-mono">
            {newTemporaryPassword.password}
          </code>
          <button
            onClick={() => setNewTemporaryPassword(null)}
            className="mt-2 text-xs text-neutral-500 hover:underline"
          >
            Fermer
          </button>
        </div>
      )}

      {importResult && (
        <div className="rounded border border-neutral-300 bg-neutral-50 p-3 text-sm">
          <p>
            {importResult.summary.createdCount} compte(s) créé(s),{" "}
            {importResult.summary.attachedCount} rattachement(s).
          </p>
          {importResult.createdAccounts.length > 0 && (
            <ul className="mt-2 flex flex-col gap-1">
              {importResult.createdAccounts.map((acc) => (
                <li key={acc.email}>
                  <strong>{acc.email}</strong> —{" "}
                  <code className="rounded bg-white px-1.5 py-0.5 font-mono">
                    {acc.temporaryPassword}
                  </code>
                </li>
              ))}
            </ul>
          )}
          {importResult.summary.errors.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-red-600">
              {importResult.summary.errors.map((e, i) => (
                <li key={i}>
                  Ligne {e.row} : {e.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="grid grid-cols-2 gap-3 rounded border border-neutral-300 p-4"
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium">Prénom</label>
            <input
              required
              value={form.firstName}
              onChange={(e) =>
                setForm((f) => ({ ...f, firstName: e.target.value }))
              }
              className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium">Nom</label>
            <input
              required
              value={form.lastName}
              onChange={(e) =>
                setForm((f) => ({ ...f, lastName: e.target.value }))
              }
              className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium">Email</label>
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
              className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium">Téléphone</label>
            <input
              value={form.phone}
              onChange={(e) =>
                setForm((f) => ({ ...f, phone: e.target.value }))
              }
              className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium">Rôle</label>
            <select
              required
              value={form.roleId}
              onChange={(e) =>
                setForm((f) => ({ ...f, roleId: e.target.value }))
              }
              className={SELECT_CLASSNAME}
            >
              <option value="">—</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium">Code vendeur</label>
            <input
              value={form.vendorCode}
              onChange={(e) =>
                setForm((f) => ({ ...f, vendorCode: e.target.value }))
              }
              placeholder="Ex: 0758591364"
              className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium">Poste</label>
            <input
              value={form.position}
              onChange={(e) =>
                setForm((f) => ({ ...f, position: e.target.value }))
              }
              placeholder="Serveur, Caissier..."
              className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium">Type de contrat</label>
            <input
              value={form.contractType}
              onChange={(e) =>
                setForm((f) => ({ ...f, contractType: e.target.value }))
              }
              placeholder="CDI, CDD, Stage..."
              className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium">Salaire (XOF)</label>
            <input
              type="number"
              min={0}
              value={form.salary}
              onChange={(e) =>
                setForm((f) => ({ ...f, salary: e.target.value }))
              }
              className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium">Date d&apos;embauche</label>
            <input
              type="date"
              value={form.hireDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, hireDate: e.target.value }))
              }
              className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
            />
          </div>
          {formError && (
            <p className="col-span-2 text-sm text-red-600">{formError}</p>
          )}
          <div className="col-span-2 flex gap-2">
            <button
              type="submit"
              className="w-fit rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
            >
              Créer
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="w-fit rounded border border-neutral-300 px-4 py-2 text-sm"
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded border border-neutral-200">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-3 py-2">Nom</th>
              <th className="px-3 py-2">Contact</th>
              <th className="px-3 py-2">Code vendeur</th>
              <th className="px-3 py-2">Poste</th>
              <th className="px-3 py-2">Rôle</th>
              <th className="px-3 py-2">Salaire</th>
              <th className="px-3 py-2">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {filtered.map((e) => (
              <tr key={e.id}>
                <td className="px-3 py-2 font-medium">
                  {e.firstName} {e.lastName}
                </td>
                <td className="px-3 py-2 text-xs text-neutral-500">
                  {e.phone ?? "—"} · {e.email}
                </td>
                <td className="px-3 py-2">
                  {canUpdate ? (
                    <input
                      defaultValue={e.vendorCode ?? ""}
                      onBlur={(ev) => {
                        if (ev.target.value !== (e.vendorCode ?? ""))
                          updateVendorCode(e.id, ev.target.value);
                      }}
                      className="w-24 rounded border border-neutral-300 px-2 py-1 text-sm"
                    />
                  ) : (
                    (e.vendorCode ?? "—")
                  )}
                </td>
                <td className="px-3 py-2">{e.position ?? "—"}</td>
                <td className="px-3 py-2">
                  {canUpdate ? (
                    <select
                      value={e.role.id}
                      onChange={(ev) => updateRole(e.id, ev.target.value)}
                      className={SELECT_CLASSNAME}
                    >
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    e.role.name
                  )}
                </td>
                <td className="px-3 py-2">{e.salary ?? "—"}</td>
                <td className="px-3 py-2">
                  {canUpdate ? (
                    <button
                      onClick={() => toggleActive(e)}
                      className={
                        e.isActive
                          ? "rounded bg-green-100 px-2 py-0.5 text-green-800"
                          : "rounded bg-neutral-100 px-2 py-0.5 text-neutral-500"
                      }
                    >
                      {e.isActive ? "Actif" : "Inactif"}
                    </button>
                  ) : (
                    <span
                      className={
                        e.isActive
                          ? "rounded bg-green-100 px-2 py-0.5 text-green-800"
                          : "rounded bg-neutral-100 px-2 py-0.5 text-neutral-500"
                      }
                    >
                      {e.isActive ? "Actif" : "Inactif"}
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-6 text-center text-neutral-500"
                >
                  Aucun employé.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
