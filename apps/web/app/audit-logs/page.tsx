"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useNestApi } from "@/hooks/useNestApi";

interface Employee {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
}

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  newValue: unknown;
  ipAddress: string | null;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

const PAGE_SIZE = 20;
const SELECT_CLASSNAME =
  "rounded border border-neutral-300 px-2 py-1.5 text-sm";

export default function AuditLogsPage() {
  const { data: session } = useSession();
  const { authFetch } = useNestApi();

  const canRead = session?.user.permissions.includes("audit:read") ?? false;

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [userId, setUserId] = useState("");
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
    });
    if (userId) params.set("userId", userId);
    if (action) params.set("action", action);
    if (from) params.set("from", `${from}T00:00:00.000Z`);
    if (to) params.set("to", `${to}T23:59:59.999Z`);
    const res = await authFetch(`/audit-logs?${params.toString()}`);
    if (!res.ok) return;
    const data = (await res.json()) as { data: AuditLog[]; meta: typeof meta };
    setLogs(data.data);
    setMeta(data.meta);
  }, [authFetch, page, userId, action, from, to]);

  useEffect(() => {
    if (!canRead) return;
    authFetch("/employees")
      .then((res) => res.json())
      .then((data: { employees: Employee[] }) => setEmployees(data.employees))
      .catch(() => setEmployees([]));
    authFetch("/audit-logs/actions")
      .then((res) => res.json())
      .then((data: { actions: string[] }) => setActions(data.actions))
      .catch(() => setActions([]));
  }, [authFetch, canRead]);

  useEffect(() => {
    if (canRead) loadLogs();
  }, [canRead, loadLogs]);

  function resetPageAnd(setter: (v: string) => void) {
    return (value: string) => {
      setter(value);
      setPage(1);
    };
  }

  if (!canRead) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-lg font-semibold">Accès refusé</p>
        <p className="text-sm text-neutral-500">
          Vous n&apos;avez pas la permission de consulter le journal
          d&apos;audit.
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
        <h1 className="text-2xl font-semibold">Journal d&apos;audit</h1>
        <Link href="/" className="text-sm text-neutral-500 hover:underline">
          ← Tableau de bord
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={userId}
          onChange={(e) => resetPageAnd(setUserId)(e.target.value)}
          className={SELECT_CLASSNAME}
        >
          <option value="">Tous les utilisateurs</option>
          {employees.map((e) => (
            <option key={e.userId} value={e.userId}>
              {e.firstName} {e.lastName}
            </option>
          ))}
        </select>
        <select
          value={action}
          onChange={(e) => resetPageAnd(setAction)(e.target.value)}
          className={SELECT_CLASSNAME}
        >
          <option value="">Toutes les actions</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={from}
          onChange={(e) => resetPageAnd(setFrom)(e.target.value)}
          className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <span className="text-sm text-neutral-400">→</span>
        <input
          type="date"
          value={to}
          onChange={(e) => resetPageAnd(setTo)(e.target.value)}
          className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
        />
      </div>

      <div className="overflow-x-auto rounded border border-neutral-200">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Utilisateur</th>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">Entité</th>
              <th className="px-3 py-2">IP</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {logs.map((log) => (
              <Fragment key={log.id}>
                <tr>
                  <td className="px-3 py-2">
                    {new Date(log.createdAt).toLocaleString("fr-FR")}
                  </td>
                  <td className="px-3 py-2">
                    {log.user
                      ? `${log.user.firstName} ${log.user.lastName}`
                      : "Système"}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{log.action}</td>
                  <td className="px-3 py-2 text-xs text-neutral-500">
                    {log.entityType}
                    {log.entityId ? ` #${log.entityId.slice(-6)}` : ""}
                  </td>
                  <td className="px-3 py-2 text-xs text-neutral-500">
                    {log.ipAddress ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {log.newValue != null && (
                      <button
                        onClick={() =>
                          setExpandedId(expandedId === log.id ? null : log.id)
                        }
                        className="text-xs text-neutral-600 hover:underline"
                      >
                        {expandedId === log.id ? "Masquer" : "Détails"}
                      </button>
                    )}
                  </td>
                </tr>
                {expandedId === log.id && log.newValue != null && (
                  <tr>
                    <td colSpan={6} className="bg-neutral-50 px-3 py-2">
                      <pre className="max-h-64 overflow-auto whitespace-pre-wrap text-xs">
                        {JSON.stringify(log.newValue, null, 2)}
                      </pre>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {logs.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-6 text-center text-neutral-500"
                >
                  Aucune entrée.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded border border-neutral-300 px-3 py-1 disabled:opacity-50"
          >
            Précédent
          </button>
          <span>
            Page {meta.page} / {meta.totalPages} ({meta.total} entrées)
          </span>
          <button
            onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
            disabled={page >= meta.totalPages}
            className="rounded border border-neutral-300 px-3 py-1 disabled:opacity-50"
          >
            Suivant
          </button>
        </div>
      )}
    </main>
  );
}
