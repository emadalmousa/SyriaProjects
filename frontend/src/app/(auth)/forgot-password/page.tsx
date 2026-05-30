"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.auth.forgotPassword(email);
    } catch {
      // neutral — don't reveal whether the email exists
    } finally {
      setLoading(false);
      setSubmitted(true);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Passwort vergessen</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gib deine E-Mail-Adresse ein, um einen Reset-Link zu erhalten.
          </p>
        </div>

        {submitted ? (
          <>
            <div className="mb-6 rounded-lg bg-green-50 p-4 text-sm text-green-700">
              Wenn ein Konto mit dieser E-Mail existiert, haben wir dir einen Link zum Zurücksetzen gesendet.
            </div>
            <p className="text-center text-sm text-gray-500">
              <Link href="/login" className="font-medium text-blue-600 hover:underline">
                Zur Anmeldeseite
              </Link>
            </p>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">E-Mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="deine@email.de"
                className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Wird gesendet..." : "Reset-Link senden"}
            </button>
            <p className="text-center text-sm text-gray-500">
              <Link href="/login" className="font-medium text-blue-600 hover:underline">
                Zurück zur Anmeldung
              </Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
