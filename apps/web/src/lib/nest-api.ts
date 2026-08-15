const API_URL = process.env.API_URL ?? "http://localhost:4100";

export class NestApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

// Petit wrapper pour les appels serveur (Server Components/Actions/Route
// Handlers) vers l'API NestJS, avec le token de la session next-auth déjà
// résolu — jamais utilisé côté client (voir décision : accessToken exposé
// dans la session next-auth mais uniquement consommé côté serveur ici).
export async function nestFetch<T>(
  accessToken: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      message?: string | string[];
    } | null;
    const message = Array.isArray(body?.message)
      ? body.message.join(", ")
      : (body?.message ?? res.statusText);
    throw new NestApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
