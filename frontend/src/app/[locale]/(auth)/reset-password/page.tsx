"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { api } from "@/lib/api";
import { Alert, Button, PageSpinner } from "@/components/ui";
import { PasswordField } from "@/components/ui";
import { AuthCard, AuthBrand } from "@/components/auth";

function ResetPasswordContent() {
  const t = useTranslations("auth.resetPassword");
  const token = useSearchParams().get("token") ?? "";
  const [newPw, setNewPw]         = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState(false);
  const [loading, setLoading]     = useState(false);
  const [showNew, setShowNew]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError("");
    if (newPw.length < 8) { setError(t("tooShort")); return; }
    if (newPw !== confirmPw) { setError(t("mismatch")); return; }
    setLoading(true);
    try { await api.auth.resetPassword(token, newPw, confirmPw); setSuccess(true); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : t("failed")); }
    finally { setLoading(false); }
  }

  return (
    <AuthCard>
      <AuthBrand title={t("title")} subtitle={t("subtitle")} />

      {success ? (
        <>
          <Alert type="success" className="mb-6">{t("success")}</Alert>
          <Link href="/login" className="block w-full rounded-lg bg-brand py-3 text-center text-sm font-semibold text-white transition hover:bg-brand-mid">
            {t("backToLogin")}
          </Link>
        </>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && <Alert type="error">{error}</Alert>}
          <PasswordField label={t("newPassword")} value={newPw} onChange={(e) => setNewPw(e.target.value)} show={showNew} onToggleShow={() => setShowNew((v) => !v)} required minLength={8} placeholder={t("newPasswordPlaceholder")} />
          <PasswordField label={t("confirmPassword")} value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} show={showConfirm} onToggleShow={() => setShowConfirm((v) => !v)} required placeholder={"••••••••"} />
          <Button type="submit" loading={loading} loadingLabel={t("saving")} className="w-full" size="lg">
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
