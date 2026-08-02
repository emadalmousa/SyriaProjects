"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { api } from "@/lib/api";
import { saveToken } from "@/lib/auth";
import { Alert, Button, PageSpinner } from "@/components/ui";
import { InputField, PasswordField } from "@/components/ui";
import { AuthCard, AuthBrand } from "@/components/auth";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (res: { credential: string }) => void }) => void;
          prompt: () => void;
          renderButton: (parent: HTMLElement, options: object) => void;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

function LoginContent() {
  const router = useRouter();
  const t = useTranslations("auth.login");
  const tc = useTranslations("common");
  const searchParams = useSearchParams();
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword]   = useState(false);
  const [showResend, setShowResend]       = useState(false);
  const [resendSent, setResendSent]       = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let attempts = 0;
    const init = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCredential,
        });
        if (googleBtnRef.current) {
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: "outline",
            size: "large",
            width: googleBtnRef.current.offsetWidth || 400,
            text: "signin_with",
          });
        }
      } else if (attempts++ < 30) {
        setTimeout(init, 100);
      }
    };
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleGoogleCredential(response: { credential: string }) {
    setError("");
    try {
      const data = await api.auth.googleLogin(response.credential);
      saveToken(data.access_token);
      router.push("/dashboard");
    } catch {
      setError(t("googleFailed"));
    }
  }

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

      <div ref={googleBtnRef} className="mb-5 flex w-full justify-center" style={{ minHeight: 44 }} />

      <div className="mb-5 flex items-center gap-3">
        <div className="flex-1 border-t border-line" />
        <span className="text-xs text-[var(--clr-text-3)]">{tc("or")}</span>
        <div className="flex-1 border-t border-line" />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <InputField label={t("email")} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="deine@email.de" required ltr />
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
