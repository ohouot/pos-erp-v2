import { create } from "zustand";

interface ConnectivityState {
  isOnline: boolean;
  setOnline: (value: boolean) => void;
}

// `navigator` n'existe pas côté serveur (SSR/RSC) — état initial neutre
// (true) et jamais lu au chargement du module ; la vraie valeur est
// hydratée côté client uniquement, dans un useEffect (voir OfflineProvider),
// jamais à l'évaluation du module comme le ferait `navigator.onLine` en top-level.
export const useConnectivityStore = create<ConnectivityState>((set) => ({
  isOnline: true,
  setOnline: (value) => set({ isOnline: value }),
}));
