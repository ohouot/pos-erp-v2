"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { EmployeesPanel } from "@/components/employees/EmployeesPanel";
import { PlanningPanel } from "@/components/employees/PlanningPanel";
import { AttendancePanel } from "@/components/employees/AttendancePanel";

export default function EmployeesPage() {
  const { data: session } = useSession();
  const [view, setView] = useState<"employees" | "planning" | "attendance">(
    "employees",
  );

  const canCreate =
    session?.user.permissions.includes("employees:create") ?? false;
  const canUpdate =
    session?.user.permissions.includes("employees:update") ?? false;
  const canRead = session?.user.permissions.includes("employees:read") ?? false;

  return (
    <main className="flex min-h-screen flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Employés</h1>
        <Link href="/" className="text-sm text-neutral-500 hover:underline">
          ← Tableau de bord
        </Link>
      </div>

      <div className="flex gap-2 border-b border-neutral-200">
        {(["employees", "planning", "attendance"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setView(tab)}
            className={`px-4 py-2 text-sm font-medium ${
              view === tab
                ? "border-b-2 border-neutral-900 text-neutral-900"
                : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            {tab === "employees"
              ? "Fiches employés"
              : tab === "planning"
                ? "Planning"
                : "Présence"}
          </button>
        ))}
      </div>

      {view === "employees" &&
        (canRead ? (
          <EmployeesPanel canCreate={canCreate} canUpdate={canUpdate} />
        ) : (
          <p className="text-sm text-neutral-500">
            Vous n&apos;avez pas accès à la liste des employés.
          </p>
        ))}
      {view === "planning" &&
        (canRead ? (
          <PlanningPanel canUpdate={canUpdate} />
        ) : (
          <p className="text-sm text-neutral-500">
            Vous n&apos;avez pas accès au planning.
          </p>
        ))}
      {view === "attendance" && <AttendancePanel canReadHistory={canRead} />}
    </main>
  );
}
