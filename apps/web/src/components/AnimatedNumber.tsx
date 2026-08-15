"use client";

import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";

export function AnimatedNumber({
  value,
  format,
  duration = 400,
}: {
  value: number;
  format: (n: number) => string;
  duration?: number;
}) {
  const displayed = useAnimatedNumber(value, duration);
  return <>{format(displayed)}</>;
}
