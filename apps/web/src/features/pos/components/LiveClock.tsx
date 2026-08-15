"use client";

import { useEffect, useState } from "react";

// Isolé dans son propre composant pour que le re-rendu à chaque seconde ne
// touche pas le reste de l'écran caisse.
export function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!now) return null;

  return (
    <div className="text-right">
      <p className="font-bold tabular-nums">
        {now.toLocaleTimeString("fr-FR")}
      </p>
      <p className="text-xs capitalize text-muted-foreground">
        {now.toLocaleDateString("fr-FR", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}
      </p>
    </div>
  );
}
