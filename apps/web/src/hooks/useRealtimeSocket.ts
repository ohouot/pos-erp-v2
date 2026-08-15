"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { io, type Socket } from "socket.io-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4100";

type EventHandler = (payload: unknown) => void;

// Chemin VPS/Docker uniquement (Socket.io) — c'est le chemin de déploiement
// réellement ciblé et vérifié de bout en bout dans ce dépôt (voir
// docker-compose.prod.yml). Le chemin Ably (serverless) reste implémenté et
// fonctionnel côté serveur (émission, `/realtime/token`, voir
// apps/api/src/realtime/) mais n'a PAS de client navigateur ici : le paquet
// npm "ably" publie un bundle dont la syntaxe fait échouer la compilation
// de production de Next.js 15 ("'super' keyword outside a method" dans
// ably/build/ably.js) — reproduit et confirmé sous next build (webpack) quel
// que soit le point d'import (composant plat, next/dynamic({ssr:false}),
// import() différé dans useEffect : les trois échouent identiquement, le
// compilateur Flight de Next trace tout le graphe atteignable d'un Client
// Component, y compris derrière un import() différé). Une intégration
// fonctionnelle nécessiterait l'API modulaire d'ably ("ably/modular",
// arbre d'imports explicite) ou un bundle vendored/patché — hors périmètre
// ici tant que le déploiement Vercel/serverless n'est pas le chemin actif.
export function useRealtimeSocket(event: string, onEvent: EventHandler): void {
  const { data: session } = useSession();
  const token = session?.accessToken;
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    if (!token) return;
    const handler = (payload: unknown) => handlerRef.current(payload);
    const socket: Socket = io(API_URL, {
      auth: { token },
      transports: ["websocket"],
    });
    socket.on(event, handler);
    return () => {
      socket.off(event, handler);
      socket.disconnect();
    };
  }, [token, event]);
}
