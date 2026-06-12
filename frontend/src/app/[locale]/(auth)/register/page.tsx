"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { api } from "@/lib/api";
import { Alert, Button } from "@/components/ui";
import { InputField, PasswordField, SelectField } from "@/components/ui";
import { AuthCardWide, AuthBrand } from "@/components/auth";

const COUNTRIES = [
  "Syrien","Deutschland","Österreich","Schweiz","Türkei","Vereinigte Arabische Emirate",
  "Saudi-Arabien","Jordanien","Libanon","Ägypten","USA","Kanada","Großbritannien",
  "Frankreich","Niederlande","Schweden","Norwegen","Dänemark","Andere",
];

function getPasswordChecks(pw: string) {
  return {
    length:    pw.length >= 8,
    upper:     /[A-Z]/.test(pw),
    lower:     /[a-z]/.test(pw),
    number:    /[0-9]/.test(pw),
    special:   /[^A-Za-z0-9]/.test(pw),
  };
}

function PasswordStrengthBar({ password }: { password: string }) {
  const checks = getPasswordChecks(password);
  const score = Object.values(checks).filter(Boolean).length;

  const bars = [
    { min: 1, color: "bg-red-500" },
    { min: 2, color: "bg-orange-400" },
    { min: 3, color: "bg-yellow-400" },
    { min: 4, color: "bg-lime-500" },
    { min: 5, color: "bg-green-500" },
  ];

  if (!password) return null;

  return (
    <div className="flex gap-1 mt-1">
      {bars.map((bar, i) => (
        <div
          key={i}
          className={`h-1 flex-1 rounded-full transition-all duration-200 ${score > i ? bar.color : "bg-[var(--clr-line)]"}`}
        />
      ))}
    </div>
  );
}

function PasswordRequirements({ password, t }: { password: string; t: (k: string) => string }) {
  const checks = getPasswordChecks(password);
  if (!password) return null;

  const items: { key: keyof typeof checks; label: string }[] = [
    { key: "length",  label: t("pwLength") },
    { key: "upper",   label: t("pwUpper") },
    { key: "lower",   label: t("pwLower") },
    { key: "number",  label: t("pwNumber") },
    { key: "special", label: t("pwSpecial") },
  ];

  return (
    <ul className="mt-2 flex flex-col gap-1">
      {items.map(({ key, label }) => (
        <li key={key} className={`flex items-center gap-1.5 text-xs transition-colors ${checks[key] ? "text-[var(--clr-ok)]" : "text-[var(--clr-text-3)]"}`}>
          <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            {checks[key]
              ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              : <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            }
          </svg>
          {label}
        </li>
      ))}
    </ul>
  );
}

export default function RegisterPage() {
  const t = useTranslations("auth.register");
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

  const passwordValid = useMemo(() => {
    const checks = getPasswordChecks(form.password);
    return Object.values(checks).every(Boolean);
  }, [form.password]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError("");
    if (!passwordValid) { setError(t("passwordWeak")); return; }
    if (form.password !== form.confirm_password) { setError(t("passwordMismatch")); return; }
    if (!form.terms) { setError(t("acceptTerms")); return; }
    setLoading(true);
    try {
      await api.auth.register(form.email, form.password, form.first_name, form.last_name, form.phone, form.country);
      setRegisteredEmail(form.email); setRegistered(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("failed"));
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
          <h1 className="mb-2 font-display text-2xl font-semibold text-[var(--clr-text)]">{t("successTitle")}</h1>
          <p className="mb-6 text-sm text-[var(--clr-text-2)]">
            {t("successBody", { email: registeredEmail })}
          </p>
          <Link href="/login" className="inline-block rounded-lg bg-brand px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-mid transition">
            {t("toLogin")}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <AuthCardWide>
      <AuthBrand title={t("title")} subtitle={t("subtitle")} />

      {error && <Alert type="error" className="mb-4">{error}</Alert>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <InputField label={t("firstName")} type="text" value={form.first_name} onChange={(e) => set("first_name", e.target.value)} placeholder="Ahmad" required ltr />
          <InputField label={t("lastName")} type="text" value={form.last_name} onChange={(e) => set("last_name", e.target.value)} placeholder="Al-Halabi" required ltr />
        </div>

        <InputField label={t("email")} type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="deine@email.de" required ltr />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <PasswordField label={t("password")} value={form.password} onChange={(e) => set("password", e.target.value)} show={showPw} onToggleShow={() => setShowPw((v) => !v)} required placeholder={"••••••••"} />
            <PasswordStrengthBar password={form.password} />
            <PasswordRequirements password={form.password} t={t} />
          </div>
          <PasswordField label={t("passwordConfirm")} value={form.confirm_password} onChange={(e) => set("confirm_password", e.target.value)} show={showCf} onToggleShow={() => setShowCf((v) => !v)} required placeholder={"••••••••"} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <SelectField label={t("country")} value={form.country} onChange={(e) => set("country", e.target.value)}>
            <option value="">{t("countryPlaceholder")}</option>
            {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </SelectField>
          <InputField label={t("phone")} type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+49 123 456789" ltr />
        </div>

        <label className="flex cursor-pointer items-start gap-3 text-sm text-[var(--clr-text-2)]">
          <input type="checkbox" checked={form.terms} onChange={(e) => set("terms", e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[var(--clr-brand)]" />
          <span>{t("terms")}</span>
        </label>

        <Button type="submit" loading={loading} loadingLabel={t("submitting")} className="mt-2 w-full" size="lg">
          {t("submit")}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--clr-text-2)]">
        {t("alreadyAccount")}{" "}
        <Link href="/login" className="font-semibold text-brand hover:underline">{t("loginLink")}</Link>
      </p>
    </AuthCardWide>
  );
}
