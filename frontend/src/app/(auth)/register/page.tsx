"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";


const COUNTRIES = [
  "Syrien", "Deutschland", "Österreich", "Schweiz", "Türkei", "Vereinigte Arabische Emirate",
  "Saudi-Arabien", "Jordanien", "Libanon", "Ägypten", "USA", "Kanada", "Großbritannien",
  "Frankreich", "Niederlande", "Schweden", "Norwegen", "Dänemark", "Andere",
];

export default function RegisterPage() {
  const [registered, setRegistered] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    confirm_password: "",
    phone: "",
    country: "",
    terms: false,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  function set(field: string, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.password.length < 8) {
      setError("Passwort muss mindestens 8 Zeichen lang sein");
      return;
    }
    if (form.password !== form.confirm_password) {
      setError("Passwörter stimmen nicht überein");
      return;
    }
    if (!form.terms) {
      setError("Bitte akzeptiere die Nutzungsbedingungen");
      return;
    }
    setLoading(true);
    try {
      await api.auth.register(form.email, form.password, form.first_name, form.last_name, form.phone, form.country);
      setRegisteredEmail(form.email);
      setRegistered(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registrierung fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  }

  if (registered) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-gray-900">Registrierung abgeschlossen</h1>
          </div>
          <div className="mb-6 rounded-lg bg-green-50 p-4 text-sm text-green-700">
            Eine Bestätigungs-E-Mail wurde an <strong>{registeredEmail}</strong> gesendet.
            Bitte überprüfe deinen Posteingang und klicke auf den Bestätigungslink.
          </div>
          <p className="text-center text-sm text-gray-500">
            <Link href="/login" className="font-medium text-blue-600 hover:underline">
              Zur Anmeldeseite
            </Link>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-lg rounded-2xl border bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Konto erstellen</h1>
          <p className="mt-1 text-sm text-gray-500">Kostenlos bei SyriaProjects registrieren</p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Vorname *</label>
              <input
                type="text"
                value={form.first_name}
                onChange={(e) => set("first_name", e.target.value)}
                required
                placeholder="Ahmad"
                className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Nachname *</label>
              <input
                type="text"
                value={form.last_name}
                onChange={(e) => set("last_name", e.target.value)}
                required
                placeholder="Al-Halabi"
                className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">E-Mail *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              required
              placeholder="deine@email.de"
              className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Passwort *</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  required
                  placeholder="••••••••"
                  minLength={8}
                  className="w-full rounded-lg border border-gray-300 bg-white p-3 pr-10 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Bestätigen *</label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={form.confirm_password}
                  onChange={(e) => set("confirm_password", e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-gray-300 bg-white p-3 pr-10 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showConfirm ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Land</label>
              <select
                value={form.country}
                onChange={(e) => set("country", e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
              >
                <option value="">Bitte wählen</option>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Telefon</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+49 123 456789"
                className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <label className="flex items-start gap-3 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={form.terms}
              onChange={(e) => set("terms", e.target.checked)}
              className="mt-0.5"
            />
            <span>
              Ich akzeptiere die{" "}
              <a href="#" className="text-blue-600 hover:underline">Nutzungsbedingungen</a>{" "}
              und{" "}
              <a href="#" className="text-blue-600 hover:underline">Datenschutzerklärung</a>
            </span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-blue-600 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Wird erstellt..." : "Konto erstellen"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Bereits ein Konto?{" "}
          <Link href="/login" className="font-medium text-blue-600 hover:underline">
            Anmelden
          </Link>
        </p>
      </div>
    </main>
  );
}
