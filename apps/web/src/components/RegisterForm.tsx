"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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

export function RegisterForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    establishmentName: "",
    establishmentType: "RESTAURANT",
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await signIn("credentials", {
      mode: "register",
      ...form,
      redirect: false,
    });

    setIsSubmitting(false);

    if (result?.error) {
      setError(result.error);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-sm flex-col gap-4"
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="firstName" className="text-sm font-medium">
            Prénom
          </label>
          <input
            id="firstName"
            required
            value={form.firstName}
            onChange={update("firstName")}
            className="rounded border border-neutral-300 px-3 py-2"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="lastName" className="text-sm font-medium">
            Nom
          </label>
          <input
            id="lastName"
            required
            value={form.lastName}
            onChange={update("lastName")}
            className="rounded border border-neutral-300 px-3 py-2"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          value={form.email}
          onChange={update("email")}
          className="rounded border border-neutral-300 px-3 py-2"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium">
          Mot de passe
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          value={form.password}
          onChange={update("password")}
          className="rounded border border-neutral-300 px-3 py-2"
        />
        <p className="text-xs text-neutral-500">
          8 caractères minimum, avec une majuscule et un chiffre.
        </p>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="establishmentName" className="text-sm font-medium">
          Nom de l&apos;établissement
        </label>
        <input
          id="establishmentName"
          required
          value={form.establishmentName}
          onChange={update("establishmentName")}
          className="rounded border border-neutral-300 px-3 py-2"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="establishmentType" className="text-sm font-medium">
          Type d&apos;établissement
        </label>
        <select
          id="establishmentType"
          value={form.establishmentType}
          onChange={update("establishmentType")}
          className="rounded border border-neutral-300 px-3 py-2"
        >
          {ESTABLISHMENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded bg-neutral-900 px-4 py-2 font-medium text-white disabled:opacity-50"
      >
        {isSubmitting ? "Création..." : "Créer mon compte"}
      </button>
      <Link
        href="/login"
        className="text-center text-sm text-neutral-500 hover:underline"
      >
        J&apos;ai déjà un compte
      </Link>
    </form>
  );
}
