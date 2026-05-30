"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Alert, Button } from "@/components/ui";
import { InputField, PasswordField, SelectField } from "@/components/ui";
import { AuthCardWide, AuthBrand } from "@/components/auth";

const COUNTRIES = [
  "Syrien","Deutschland","Österreich","Schweiz","Türkei","Vereinigte Arabische Emirate",
  "Saudi-Arabien","Jordanien","Libanon","Ägypten","USA","Kanada","Großbritannien",
  "Frankreich","Niederlande","Schweden","Norwegen","Dänemark","Andere",
];

export default function RegisterPage() {
  const [registered, setRegistered] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "", password: "",
    confirm_password: "", phone: "", country: "", terms: false,
  });
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw]   = useState(false);
  const [showCf, setShowCf]   = useState(false);

  function set(field: string, value: string | boolean) { setForm((f) => ({ ...f, [field]: value })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError("");
    if (form.password.length < 8) { setError("Passwort muss mindestens 8 Zeichen lang sein"); return; }
    if (form.password !== form.confirm_password) { setError("Passwörter stimmen nicht überein"); return; }
    if (!form.terms) { setError("Bitte akzeptiere die Nutzungsbedingungen"); return; }
    setLoading(true);
    try {
      await api.auth.register(form.email, form.password, form.first_name, form.last_name, form.phone, form.country);
      setRegisteredEmail(form.email); setRegistered(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registrierung fehlgeschlagen");
    } finally { setLoading(false); }
  }

  if (registered) {
    return (
      <main className="auth-bg flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md rounded-card border border-line bg-surface p-8 text-center" style={{ boxShadow: "var(--sh-lg)" }}>
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--clr-ok-dim)]">
            <svg className="h-7 w-7 text-[var(--clr-ok)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="mb-2 font-display text-2xl font-semibold text-[var(--clr-text)]">Fast geschafft!</h1>
          <p className="mb-6 text-sm text-[var(--clr-text-2)]">
            Eine Bestätigungs-E-Mail wurde an <strong className="text-[var(--clr-text)]">{registeredEmail}</strong> gesendet.
          </p>
          <Link href="/login" className="inline-block rounded-lg bg-brand px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-mid transition">
            Zur Anmeldung
          </Link>
        </div>
      </main>
    );
  }

  return (
    <AuthCardWide>
      <AuthBrand title="Konto erstellen" subtitle="Kostenlos bei SyriaProjects registrieren" />

      {error && <Alert type="error" className="mb-4">{error}</Alert>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <InputField label="Vorname" type="text" value={form.first_name} onChange={(e) => set("first_name", e.target.value)} placeholder="Ahmad" required />
          <InputField label="Nachname" type="text" value={form.last_name} onChange={(e) => set("last_name", e.target.value)} placeholder="Al-Halabi" required />
        </div>

        <InputField label="E-Mail" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="deine@email.de" required />

        <div className="grid grid-cols-2 gap-3">
          <PasswordField label="Passwort" value={form.password} onChange={(e) => set("password", e.target.value)} show={showPw} onToggleShow={() => setShowPw((v) => !v)} required minLength={8} placeholder="••••••••" />
          <PasswordField label="Bestätigen" value={form.confirm_password} onChange={(e) => set("confirm_password", e.target.value)} show={showCf} onToggleShow={() => setShowCf((v) => !v)} required placeholder="••••••••" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <SelectField label="Land" value={form.country} onChange={(e) => set("country", e.target.value)}>
            <option value="">Bitte wählen</option>
            {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </SelectField>
          <InputField label="Telefon" type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+49 123 456789" />
        </div>

        <label className="flex cursor-pointer items-start gap-3 text-sm text-[var(--clr-text-2)]">
          <span
            className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition
              ${form.terms ? "border-brand bg-brand" : "border-line-mid bg-surface"}`}
            onClick={() => set("terms", !form.terms)}
            aria-hidden
          >
            {form.terms && <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
          </span>
          <input type="checkbox" checked={form.terms} onChange={(e) => set("terms", e.target.checked)} className="sr-only" />
          <span>
            Ich akzeptiere die <a href="#" className="font-semibold text-brand hover:underline">Nutzungsbedingungen</a> und{" "}
            <a href="#" className="font-semibold text-brand hover:underline">Datenschutzerklärung</a>
          </span>
        </label>

        <Button type="submit" loading={loading} loadingLabel="Wird erstellt..." className="mt-2 w-full" size="lg">
          Konto erstellen
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--clr-text-2)]">
        Bereits ein Konto?{" "}
        <Link href="/login" className="font-semibold text-brand hover:underline">Anmelden</Link>
      </p>
    </AuthCardWide>
  );
}
