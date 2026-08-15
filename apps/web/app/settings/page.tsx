import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { nestFetch } from "@/lib/nest-api";
import {
  EstablishmentSettingsForm,
  type EstablishmentData,
} from "@/components/EstablishmentSettingsForm";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  if (!session.activeEstablishmentId) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-2xl font-semibold">Paramètres</h1>
        <p className="text-sm text-neutral-600">
          Sélectionne un établissement depuis le tableau de bord pour accéder à
          ses paramètres.
        </p>
      </main>
    );
  }

  if (!session.user.permissions.includes("establishments:read")) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-2xl font-semibold">Paramètres</h1>
        <p className="text-sm text-neutral-600">
          Tu n&apos;as pas accès à cette page.
        </p>
      </main>
    );
  }

  const establishment = await nestFetch<{ establishment: EstablishmentData }>(
    session.accessToken,
    `/establishments/${session.activeEstablishmentId}`,
  ).then((data) => data.establishment);

  const canEdit = session.user.permissions.includes("establishments:update");

  return (
    <main className="flex min-h-screen flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold">
        Paramètres — {establishment.name}
      </h1>
      <EstablishmentSettingsForm
        establishment={establishment}
        canEdit={canEdit}
      />
    </main>
  );
}
