"use client";

import { useEffect, useRef, useState } from "react";

// Fait défiler la valeur affichée entre l'ancienne et la nouvelle sur
// `duration` ms (ease-out) — utilisé pour le total du ticket caisse, qui
// ne doit jamais sauter brutalement d'un montant à l'autre.
export function useAnimatedNumber(value: number, duration = 400): number {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const frameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) return;

    const start = performance.now();
    function tick(now: number) {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - progress) * (1 - progress);
      setDisplay(from + (to - from) * eased);
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    }
    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [value, duration]);

  return display;
}
