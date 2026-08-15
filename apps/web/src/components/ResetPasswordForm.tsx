"use client";

import { useState } from "react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4100";

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [state, setState] = useState<"idle" | "done" | "error">("idle");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    const res = await fetch(`${API_URL}/api/v1/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    setIsSubmitting(false);
    setState(res.ok ? "done" : "error");
  }

  if (state === "done") {
    return (
      <div className="flex max-w-sm flex-col items-center gap-3 text-center text-sm">
        <p>Mot de passe mis à jour avec succès.</p>
        <Link href="/login" className="text-neutral-900 underline">
          Se connecter
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-sm flex-col gap-4"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium">
          Nouveau mot de passe
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded border border-neutral-300 px-3 py-2"
        />
      </div>
      {state === "error" && (
        <p className="text-sm text-red-600">
          Lien de réinitialisation invalide ou expiré.
        </p>
      )}
      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded bg-neutral-900 px-4 py-2 font-medium text-white disabled:opacity-50"
      >
        {isSubmitting ? "Mise à jour..." : "Réinitialiser le mot de passe"}
      </button>
    </form>
  );
}
