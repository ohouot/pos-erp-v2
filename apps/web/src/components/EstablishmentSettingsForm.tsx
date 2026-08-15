"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4100";

const ESTABLISHMENT_TYPES = [
  "MAQUIS",
  "LOUNGE",
  "BAR",
  "CAVE",
  "RESTAURANT",
  "SNACK",
  "FAST_FOOD",
  "GLACIER",
  "CAFE",
  "HOTEL",
] as const;

export interface EstablishmentData {
  id: string;
  name: string;
  type: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  currency: string;
  taxRate: string;
  language: string;
  timezone: string;
  isActive: boolean;
}

export function EstablishmentSettingsForm({
  establishment,
  canEdit,
}: {
  establishment: EstablishmentData;
  canEdit: boolean;
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const [form, setForm] = useState({
    name: establishment.name,
    type: establishment.type,
    address: establishment.address ?? "",
    phone: establishment.phone ?? "",
    email: establishment.email ?? "",
    currency: establishment.currency,
    taxRate: establishment.taxRate,
    language: establishment.language,
    timezone: establishment.timezone,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isTogglingActive, setIsTogglingActive] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function patchEstablishment(body: Record<string, unknown>) {
    if (!session?.accessToken) return false;
    const res = await fetch(
      `${API_URL}/api/v1/establishments/${establishment.id}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );
    return res.ok;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    const ok = await patchEstablishment({
      ...form,
      taxRate: Number(form.taxRate),
    });
    setIsSaving(false);
    setMessage(ok ? "Établissement mis à jour." : "Échec de la mise à jour.");
    if (ok) router.refresh();
  }

  async function handleToggleActive() {
    setIsTogglingActive(true);
    const ok = await patchEstablishment({ isActive: !establishment.isActive });
    setIsTogglingActive(false);
    if (ok) router.refresh();
  }

  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={handleSubmit} className="flex max-w-lg flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="name" className="text-sm font-medium">
            Nom
          </label>
          <input
            id="name"
            required
            disabled={!canEdit}
            value={form.name}
            onChange={update("name")}
            className="rounded border border-neutral-300 px-3 py-2 disabled:bg-neutral-100"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="type" className="text-sm font-medium">
            Type
          </label>
          <select
            id="type"
            disabled={!canEdit}
            value={form.type}
            onChange={update("type")}
            className="rounded border border-neutral-300 px-3 py-2 disabled:bg-neutral-100"
          >
            {ESTABLISHMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="phone" className="text-sm font-medium">
              Téléphone
            </label>
            <input
              id="phone"
              disabled={!canEdit}
              value={form.phone}
              onChange={update("phone")}
              className="rounded border border-neutral-300 px-3 py-2 disabled:bg-neutral-100"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              disabled={!canEdit}
              value={form.email}
              onChange={update("email")}
              className="rounded border border-neutral-300 px-3 py-2 disabled:bg-neutral-100"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="address" className="text-sm font-medium">
            Adresse
          </label>
          <input
            id="address"
            disabled={!canEdit}
            value={form.address}
            onChange={update("address")}
            className="rounded border border-neutral-300 px-3 py-2 disabled:bg-neutral-100"
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="currency" className="text-sm font-medium">
              Devise
            </label>
            <input
              id="currency"
              disabled={!canEdit}
              value={form.currency}
              onChange={update("currency")}
              className="rounded border border-neutral-300 px-3 py-2 disabled:bg-neutral-100"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="taxRate" className="text-sm font-medium">
              Taxe (%)
            </label>
            <input
              id="taxRate"
              type="number"
              min={0}
              max={100}
              disabled={!canEdit}
              value={form.taxRate}
              onChange={update("taxRate")}
              className="rounded border border-neutral-300 px-3 py-2 disabled:bg-neutral-100"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="language" className="text-sm font-medium">
              Langue
            </label>
            <input
              id="language"
              disabled={!canEdit}
              value={form.language}
              onChange={update("language")}
              className="rounded border border-neutral-300 px-3 py-2 disabled:bg-neutral-100"
            />
          </div>
        </div>
        {canEdit && (
          <button
            type="submit"
            disabled={isSaving}
            className="w-fit rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {isSaving ? "Enregistrement..." : "Enregistrer"}
          </button>
        )}
        {message && <p className="text-sm text-neutral-600">{message}</p>}
      </form>

      {canEdit && (
        <div className="max-w-lg rounded border border-red-300 bg-red-50 p-4">
          <h3 className="text-sm font-semibold text-red-900">Zone de danger</h3>
          <p className="mt-1 text-sm text-red-800">
            {establishment.isActive
              ? "Désactiver cet établissement empêche toute nouvelle connexion pour ses membres."
              : "Cet établissement est désactivé — ses membres ne peuvent plus l'utiliser."}
          </p>
          <button
            onClick={handleToggleActive}
            disabled={isTogglingActive}
            className="mt-3 rounded border border-red-400 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
          >
            {isTogglingActive
              ? "..."
              : establishment.isActive
                ? "Désactiver l'établissement"
                : "Réactiver l'établissement"}
          </button>
        </div>
      )}
    </div>
  );
}
