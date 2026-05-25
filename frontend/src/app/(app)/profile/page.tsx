"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import type { User } from "@/types";

const COUNTRIES = [
  "Syrien", "Deutschland", "Österreich", "Schweiz", "Türkei", "Vereinigte Arabische Emirate",
  "Saudi-Arabien", "Jordanien", "Libanon", "Ägypten", "USA", "Kanada", "Großbritannien",
  "Frankreich", "Niederlande", "Schweden", "Norwegen", "Dänemark", "Andere",
];

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    country: "",
  });
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.users
      .me()
      .then((u) => {
        const me = u as User;
        setUser(me);
        setForm({
          first_name: me.first_name || "",
          last_name: me.last_name || "",
          phone: me.phone || "",
          country: me.country || "",
        });
      })
      .catch(() => router.push("/login"));
  }, [router]);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    if (!form.first_name.trim()) {
      setError("Vorname ist erforderlich");
      return;
    }
    setLoading(true);
    try {
      const updated = await api.users.updateProfile(form) as User;
      setUser(updated);
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Fehler beim Speichern");
    } finally {
      setLoading(false);
    }
  }

  if (!user) return <p className="p-8">Laden...</p>;

  const initials = ((user.first_name?.[0] || "") + (user.last_name?.[0] || "")).toUpperCase() || user.email[0].toUpperCase();

  return (
    <main className="min-h-screen bg-gray-50 p-8 dark:bg-gray-900">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            ← Zurück
          </Link>
          <h1 className="text-2xl font-bold dark:text-white">Profil bearbeiten</h1>
        </div>

        <div className="rounded-2xl border bg-white p-8 shadow-sm dark:bg-gray-800 dark:border-gray-700">

          {/* Avatar + Info */}
          <div className="mb-8 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-600 dark:bg-blue-900 dark:text-blue-300">
              {initials}
            </div>
            <div>
              <p className="font-semibold dark:text-white">
                {[user.first_name, user.last_name].filter(Boolean).join(" ") || "—"}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
              <span className="mt-1 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                {user.global_role}
              </span>
            </div>
          </div>

          {success && (
            <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-900/30 dark:text-green-400">
              Profil erfolgreich gespeichert.
            </div>
          )}
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            {/* Name */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Vorname *</label>
                <input
                  type="text"
                  value={form.first_name}
                  onChange={(e) => set("first_name", e.target.value)}
                  required
                  placeholder="Ahmad"
                  className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Nachname</label>
                <input
                  type="text"
                  value={form.last_name}
                  onChange={(e) => set("last_name", e.target.value)}
                  placeholder="Al-Halabi"
                  className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                />
              </div>
            </div>

            {/* E-Mail (readonly) */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">E-Mail</label>
              <input
                type="email"
                value={user.email}
                disabled
                className="w-full rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-400 dark:border-gray-600 dark:bg-gray-700/50 dark:text-gray-500"
              />
            </div>

            {/* Telefon + Land */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Telefon</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="+49 123 456789"
                  className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Land</label>
                <select
                  value={form.country}
                  onChange={(e) => set("country", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Bitte wählen</option>
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 rounded-lg bg-blue-600 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Wird gespeichert..." : "Speichern"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
