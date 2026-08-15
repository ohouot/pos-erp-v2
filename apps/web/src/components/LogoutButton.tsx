"use client";

import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="rounded border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-100"
    >
      Se déconnecter
    </button>
  );
}
