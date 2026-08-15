"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useConnectivityStore } from "@/stores/connectivity.store";
import { syncOfflineOrders } from "@/lib/offlineSync";

// Monté une seule fois à la racine (voir app/layout.tsx) — persiste à
// travers les navigations, comme AuthProvider dans le projet de référence.
// `navigator.onLine` n'est lu qu'ici, côté client, jamais à l'évaluation du
// module (voir connectivity.store.ts).
export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const setOnline = useConnectivityStore((s) => s.setOnline);

  useEffect(() => {
    setOnline(navigator.onLine);

    function handleOnline() {
      setOnline(true);
    }
    function handleOffline() {
      setOnline(false);
    }
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [setOnline]);

  useEffect(() => {
    if (navigator.onLine && session?.accessToken) {
      syncOfflineOrders(session.accessToken);
    }
  }, [session?.accessToken]);

  useEffect(() => {
    function handleOnline() {
      if (session?.accessToken) syncOfflineOrders(session.accessToken);
    }
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [session?.accessToken]);

  return <>{children}</>;
}
