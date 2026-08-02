"use client";

import { useState, useEffect, useRef, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { api } from "@/lib/api";
import { saveToken } from "@/lib/auth";
import { Alert, Button } from "@/components/ui";
import { InputField, PasswordField, SelectField } from "@/components/ui";

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

const COUNTRIES = [
  "Syrien","Deutschland","Österreich","Schweiz","Türkei","Vereinigte Arabische Emirate",
  "Saudi-Arabien","Jordanien","Libanon","Ägypten","USA","Kanada","Großbritannien",
  "Frankreich","Niederlande","Schweden","Norwegen","Dänemark","Andere",
];

function getPasswordChecks(pw: string) {
  return {
    length:  pw.length >= 8,
    upper:   /[A-Z]/.test(pw),
    lower:   /[a-z]/.test(pw),
    number:  /[0-9]/.test(pw),
    special: /[^A-Za-z0-9]/.test(pw),
  };
}

function GoogleButton({ onClick, loading, label }: { onClick: () => void; loading: boolean; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="flex w-full items-center justify-center gap-3 rounded-xl border border-[var(--clr-line)] bg-[var(--clr-surface-2)] px-4 py-3 text-sm font-medium text-[var(--clr-text-2)] transition hover:border-[var(--clr-brand)]/40 hover:bg-[var(--clr-surface)] hover:text-[var(--clr-text)] disabled:opacity-50 dark:bg-[var(--clr-surface)]"
    >
      <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      {loading ? "Laden..." : label}
    </button>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 border-t border-[var(--clr-line)]" />
      <span className="text-xs text-[var(--clr-text-3)]">{label}</span>
      <div className="flex-1 border-t border-[var(--clr-line)]" />
    </div>
  );
}

function HomeContent() {
  const router = useRouter();
  const tLogin = useTranslations("auth.login");
  const tReg = useTranslations("auth.register");
  const tc = useTranslations("common");
  const searchParams = useSearchParams();

  const [tab, setTab] = useState<"login" | "register">(
    searchParams.get("tab") === "register" ? "register" : "login"
  );
  const [error, setError] = useState("");
  const googleBtnRef = useRef<HTMLDivElement>(null);

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  // Register state
  const [regForm, setRegForm] = useState({
    first_name: "", last_name: "", email: "", password: "",
    confirm_password: "", phone: "", country: "", terms: false,
  });
  const [regLoading, setRegLoading] = useState(false);
  const [showRegPw, setShowRegPw] = useState(false);
  const [showRegCf, setShowRegCf] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

  function setReg(field: string, value: string | boolean) {
    setRegForm((f) => ({ ...f, [field]: value }));
  }

  const passwordValid = useMemo(() => {
    const checks = getPasswordChecks(regForm.password);
    return Object.values(checks).every(Boolean);
  }, [regForm.password]);

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
      setError(tLogin("googleFailed"));
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setShowResend(false); setResendSent(false); setLoginLoading(true);
    try {
      const data = await api.auth.login(loginEmail, loginPassword);
      saveToken(data.access_token);
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : tLogin("loginFailed");
      if (msg === "EMAIL_NOT_VERIFIED") { setError("EMAIL_NOT_VERIFIED"); setShowResend(true); }
      else setError(msg);
    } finally { setLoginLoading(false); }
  }

  async function handleResend() {
    setResendLoading(true);
    try { await api.auth.resendVerification(loginEmail); } catch { /* neutral */ }
    finally { setResendLoading(false); setResendSent(true); }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault(); setError("");
    if (!passwordValid) { setError(tReg("passwordWeak")); return; }
    if (regForm.password !== regForm.confirm_password) { setError(tReg("passwordMismatch")); return; }
    if (!regForm.terms) { setError(tReg("acceptTerms")); return; }
    setRegLoading(true);
    try {
      await api.auth.register(regForm.email, regForm.password, regForm.first_name, regForm.last_name, regForm.phone, regForm.country);
      setRegisteredEmail(regForm.email); setRegistered(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : tReg("failed"));
    } finally { setRegLoading(false); }
  }

  function switchTab(t: "login" | "register") {
    setTab(t);
    setError("");
    setShowResend(false);
    setResendSent(false);
  }

  return (
    <main className="auth-bg flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">

        {/* Brand */}
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--clr-brand)]">
            <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
            </svg>
          </div>
          <h1 className="font-display text-2xl font-bold text-[var(--clr-text)]">SyriaProjects</h1>
          <p className="mt-1 text-sm text-[var(--clr-text-3)]">{tc("home.subtitle")}</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-[var(--clr-line)] bg-[var(--clr-surface)] p-7" style={{ boxShadow: "var(--sh-lg)" }}>

          {/* Tab switcher */}
          <div className="mb-6 flex rounded-xl bg-[var(--clr-surface-2)] p-1">
            <button
              onClick={() => switchTab("login")}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${tab === "login" ? "bg-[var(--clr-surface)] text-[var(--clr-text)] shadow-sm" : "text-[var(--clr-text-3)] hover:text-[var(--clr-text-2)]"}`}
            >
              {tLogin("submit")}
            </button>
            <button
              onClick={() => switchTab("register")}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${tab === "register" ? "bg-[var(--clr-surface)] text-[var(--clr-text)] shadow-sm" : "text-[var(--clr-text-3)] hover:text-[var(--clr-text-2)]"}`}
            >
              {tc("home.register")}
            </button>
          </div>

          {/* Google button */}
          <div ref={googleBtnRef} className="flex w-full justify-center" style={{ minHeight: 44 }} />

          <div className="my-5">
            <Divider label={tc("or")} />
          </div>

          {/* Error */}
          {error === "EMAIL_NOT_VERIFIED" ? (
            <Alert type="error" className="mb-4">
              <p>{tLogin("emailNotVerified")}</p>
              {showResend && !resendSent && (
                <button onClick={handleResend} disabled={resendLoading} className="mt-2 font-semibold underline disabled:opacity-50">
                  {resendLoading ? tLogin("resendSending") : tLogin("resendLink")}
                </button>
              )}
              {resendSent && <p className="mt-2 text-emerald-700 dark:text-emerald-400">{tLogin("resendSent")}</p>}
            </Alert>
          ) : error ? (
            <Alert type="error" className="mb-4">{error}</Alert>
          ) : null}

          {/* Registered success */}
          {registered ? (
            <div className="rounded-xl bg-[var(--clr-ok-dim)] p-4 text-center">
              <p className="font-semibold text-[var(--clr-ok)]">{tReg("successTitle")}</p>
              <p className="mt-1 text-sm text-[var(--clr-text-2)]">{tReg("successBody", { email: registeredEmail })}</p>
              <button
                onClick={() => { setRegistered(false); switchTab("login"); }}
                className="mt-3 text-sm font-semibold text-[var(--clr-brand)] hover:underline"
              >
                {tReg("toLogin")}
              </button>
            </div>
          ) : tab === "login" ? (

            /* ── LOGIN FORM ── */
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <InputField
                label={tLogin("email")}
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="deine@email.de"
                required
                ltr
              />
              <div>
                <PasswordField
                  label={tLogin("password")}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  show={showLoginPw}
                  onToggleShow={() => setShowLoginPw((v) => !v)}
                  required
                  placeholder="••••••••"
                />
                <div className="mt-1.5 text-end">
                  <a
                    href="/de/forgot-password"
                    className="text-xs font-semibold text-[var(--clr-brand)] hover:underline"
                  >
                    {tLogin("forgotPassword")}
                  </a>
                </div>
              </div>
              <Button type="submit" loading={loginLoading} loadingLabel={tc("buttons.loading")} className="w-full" size="lg">
                {tLogin("submit")}
              </Button>
            </form>

          ) : (

            /* ── REGISTER FORM ── */
            <form onSubmit={handleRegister} className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <InputField label={tReg("firstName")} type="text" value={regForm.first_name} onChange={(e) => setReg("first_name", e.target.value)} placeholder="Ahmad" required ltr />
                <InputField label={tReg("lastName")} type="text" value={regForm.last_name} onChange={(e) => setReg("last_name", e.target.value)} placeholder="Al-Halabi" required ltr />
              </div>
              <InputField label={tReg("email")} type="email" value={regForm.email} onChange={(e) => setReg("email", e.target.value)} placeholder="deine@email.de" required ltr />
              <PasswordField label={tReg("password")} value={regForm.password} onChange={(e) => setReg("password", e.target.value)} show={showRegPw} onToggleShow={() => setShowRegPw((v) => !v)} required placeholder="••••••••" />
              <PasswordField label={tReg("passwordConfirm")} value={regForm.confirm_password} onChange={(e) => setReg("confirm_password", e.target.value)} show={showRegCf} onToggleShow={() => setShowRegCf((v) => !v)} required placeholder="••••••••" />
              <div className="grid grid-cols-2 gap-3">
                <SelectField label={tReg("country")} value={regForm.country} onChange={(e) => setReg("country", e.target.value)}>
                  <option value="">{tReg("countryPlaceholder")}</option>
                  {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </SelectField>
                <InputField label={tReg("phone")} type="tel" value={regForm.phone} onChange={(e) => setReg("phone", e.target.value)} placeholder="+49 123 456" ltr />
              </div>
              <label className="flex cursor-pointer items-start gap-2.5 text-sm text-[var(--clr-text-2)]">
                <input type="checkbox" checked={regForm.terms} onChange={(e) => setReg("terms", e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[var(--clr-brand)]" />
                <span>{tReg("terms")}</span>
              </label>
              <Button type="submit" loading={regLoading} loadingLabel={tReg("submitting")} className="mt-1 w-full" size="lg">
                {tReg("submit")}
              </Button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  );
}
