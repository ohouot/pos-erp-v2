// Convertit une durée façon jsonwebtoken ("15m", "7d"...) en millisecondes.
export function parseDurationMs(value: string): number {
  const match = /^(\d+)(s|m|h|d)$/.exec(value.trim());
  if (!match) {
    throw new Error(
      `Format de durée invalide : "${value}" (attendu ex. "15m", "7d")`,
    );
  }
  const amount = Number(match[1]);

  switch (match[2]) {
    case "s":
      return amount * 1000;
    case "m":
      return amount * 60_000;
    case "h":
      return amount * 3_600_000;
    case "d":
      return amount * 86_400_000;
    default:
      throw new Error(`Format de durée invalide : "${value}"`);
  }
}
