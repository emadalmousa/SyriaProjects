"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { signIn } from "next-auth/react";
import { api } from "@/lib/api";
import { saveToken } from "@/lib/auth";
import { Alert, Button, PageSpinner } from "@/components/ui";
import { InputField, PasswordField } from "@/components/ui";
import { AuthCard, AuthBrand } from "@/components/auth";

function LoginContent() {
  const router = useRouter();
  const t = useTranslations("auth.login");
  const tc = useTranslations("common");
  const searchParams = useSearchParams();
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword]   = useState(false);
  const [showResend, setShowResend]       = useState(false);
  const [resendSent, setResendSent]       = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const registeredParam = searchParams.get("registered");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setShowResend(false); setResendSent(false); setLoading(true);
    try {
      const data = await api.auth.login(email, password);
      saveToken(data.access_token);
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("loginFailed");
      if (msg === "EMAIL_NOT_VERIFIED") { setError("EMAIL_NOT_VERIFIED"); setShowResend(true); }
      else setError(msg);
    } finally { setLoading(false); }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    try {
      const result = await signIn("google", { redirect: false });
      if (result?.error) { setError(t("googleFailed")); setGoogleLoading(false); return; }
      const { getSession } = await import("next-auth/react");
      const session = await getSession();
      const googleIdToken = (session as { googleIdToken?: string } | null)?.googleIdToken;
      if (googleIdToken) { const data = await api.auth.googleLogin(googleIdToken); saveToken(data.access_token); router.push("/dashboard"); }
    } catch { setError(t("googleFailed")); setGoogleLoading(false); }
  }

  async function handleResend() {
    setResendLoading(true);
    try { await api.auth.resendVerification(email); } catch { /* neutral */ }
    finally { setResendLoading(false); setResendSent(true); }
  }

  return (
    <AuthCard>
      <AuthBrand title={t("title")} subtitle={t("subtitle")} />

      {registeredParam === "1" && (
        <Alert type="info" className="mb-4">{t("registeredSuccess")}</Alert>
      )}
      {error === "EMAIL_NOT_VERIFIED" ? (
        <Alert type="error" className="mb-4">
          <p>{t("emailNotVerified")}</p>
          {showResend && !resendSent && (
            <button onClick={handleResend} disabled={resendLoading} className="mt-2 font-semibold underline disabled:opacity-50">
              {resendLoading ? t("resendSending") : t("resendLink")}
            </button>
          )}
          {resendSent && <p className="mt-2 text-emerald-700 dark:text-emerald-400">{t("resendSent")}</p>}
        </Alert>
      ) : error ? (
        <Alert type="error" className="mb-4">{error}</Alert>
      ) : null}

      {/* Google */}
      <button
        onClick={handleGoogle}
        disabled={googleLoading}
        className="mb-5 flex w-full items-center justify-center gap-3 rounded-lg border border-line bg-surface-2 px-4 py-3 text-sm font-medium text-[var(--clr-text-2)] transition hover:border-brand/30 hover:text-[var(--clr-text)] disabled:opacity-60 dark:bg-surface"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        {googleLoading ? t("googleLoading") : t("googleButton")}
      </button>

      <div className="mb-5 flex items-center gap-3">
        <div className="flex-1 border-t border-line" />
        <span className="text-xs text-[var(--clr-text-3)]">{tc("or")}</span>
        <div className="flex-1 border-t border-line" />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <InputField label={t("email")} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="deine@email.de" required />
        <PasswordField label={t("password")} value={password} onChange={(e) => setPassword(e.target.value)} show={showPassword} onToggleShow={() => setShowPassword((v) => !v)} required placeholder={"••••••••"} />
        <div className="text-end">
          <Link href="/forgot-password" className="text-xs font-semibold text-brand hover:underline">{t("forgotPassword")}</Link>
        </div>
        <Button type="submit" loading={loading} loadingLabel={tc("buttons.loading")} className="w-full" size="lg">
          {t("submit")}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--clr-text-2)]">
        {t("noAccount")}{" "}
        <Link href="/register" className="font-semibold text-brand hover:underline">{t("registerLink")}</Link>
      </p>
    </AuthCard>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <LoginContent />
    </Suspense>
  );
}
