"use client";

import { useCallback } from "react";
import { useSession } from "next-auth/react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4100";

// Petit wrapper client pour appeler l'API NestJS avec le token de la
// session next-auth déjà résolu — même pattern que EstablishmentSwitcher.
export function useNestApi() {
  const { data: session } = useSession();

  const authFetch = useCallback(
    async (path: string, init?: RequestInit) => {
      if (!session?.accessToken) throw new Error("Session absente");
      const res = await fetch(`${API_URL}/api/v1${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          ...(init?.body && !(init.body instanceof FormData)
            ? { "Content-Type": "application/json" }
            : {}),
          ...init?.headers,
        },
      });
      return res;
    },
    [session?.accessToken],
  );

  return { authFetch, accessToken: session?.accessToken, apiUrl: API_URL };
}
