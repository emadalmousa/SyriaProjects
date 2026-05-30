"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Alert, Button } from "@/components/ui";
import { InputField } from "@/components/ui";
import { AuthCard, AuthBrand } from "@/components/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail]         = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading]     = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    try { await api.auth.forgotPassword(email); } catch { /* neutral */ }
    finally { setLoading(false); setSubmitted(true); }
  }

  return (
    <AuthCard>
      <AuthBrand title="Passwort vergessen" subtitle="Wir senden dir einen Reset-Link per E-Mail." />

      {submitted ? (
        <>
          <Alert type="success" className="mb-6">
            Falls ein Konto mit dieser E-Mail existiert, haben wir einen Reset-Link gesendet.
          </Alert>
          <Link href="/login" className="block w-full rounded-lg bg-brand py-3 text-center text-sm font-semibold text-white transition hover:bg-brand-mid">
            Zur Anmeldung
          </Link>
        </>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <InputField label="E-Mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="deine@email.de" required />
          <Button type="submit" loading={loading} loadingLabel="Wird gesendet..." className="w-full" size="lg">
            Reset-Link senden
          </Button>
          <p className="text-center text-sm text-[var(--clr-text-2)]">
            <Link href="/login" className="font-semibold text-brand hover:underline">Zurück zur Anmeldung</Link>
          </p>
        </form>
      )}
    </AuthCard>
  );
}
