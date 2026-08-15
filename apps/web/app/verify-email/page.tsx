import Link from "next/link";

const API_URL = process.env.API_URL ?? "http://localhost:4100";

async function verify(token: string): Promise<boolean> {
  const res = await fetch(`${API_URL}/api/v1/auth/verify-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
    cache: "no-store",
  });
  return res.ok;
}

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const ok = token ? await verify(token) : false;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-2xl font-semibold">Confirmation d&apos;email</h1>
      {ok ? (
        <div className="flex flex-col items-center gap-3 text-sm">
          <p>Email confirmé avec succès.</p>
          <Link href="/" className="text-neutral-900 underline">
            Aller au tableau de bord
          </Link>
        </div>
      ) : (
        <div className="flex max-w-sm flex-col items-center gap-3 text-sm">
          <p>Lien expiré ou invalide.</p>
          <p className="text-neutral-500">
            Ton compte reste utilisable normalement — la confirmation n&apos;est
            qu&apos;une formalité.
          </p>
        </div>
      )}
    </main>
  );
}
