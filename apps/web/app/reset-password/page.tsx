import Link from "next/link";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-semibold">Réinitialiser le mot de passe</h1>
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <div className="flex max-w-sm flex-col items-center gap-3 text-center text-sm">
          <p>Lien invalide.</p>
          <Link href="/forgot-password" className="text-neutral-900 underline">
            Redemander un lien
          </Link>
        </div>
      )}
    </main>
  );
}
