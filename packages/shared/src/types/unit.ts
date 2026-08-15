export interface Unit {
  id: string;
  establishmentId: string | null; // null = unité système partagée
  name: string;
  symbol: string;
}
