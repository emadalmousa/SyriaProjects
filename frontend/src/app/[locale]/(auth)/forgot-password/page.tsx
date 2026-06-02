"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { api } from "@/lib/api";
import { Alert, Button } from "@/components/ui";
import { InputField } from "@/components/ui";
import { AuthCard, AuthBrand } from "@/components/auth";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth.forgotPassword");
  const tc = useTranslations("common");
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
      <AuthBrand title={t("title")} subtitle={t("subtitle")} />

      {submitted ? (
        <>
          <Alert type="success" className="mb-6">
            {t("successMessage")}
          </Alert>
          <Link href="/login" className="block w-full rounded-lg bg-brand py-3 text-center text-sm font-semibold text-white transition hover:bg-brand-mid">
            {t("toLogin")}
          </Link>
        </>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <InputField label={t("email")} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="deine@email.de" required />
          <Button type="submit" loading={loading} loadingLabel={tc("buttons.sending")} className="w-full" size="lg">
            {t("submit")}
          </Button>
          <p className="text-center text-sm text-[var(--clr-text-2)]">
            <Link href="/login" className="font-semibold text-brand hover:underline">{t("backToLogin")}</Link>
          </p>
        </form>
      )}
    </AuthCard>
  );
}
