"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { api } from "@/lib/api";

function VerifyEmailContent() {
  const t = useTranslations("auth.verifyEmail");
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus]   = useState<"pending" | "loading" | "success" | "error">("pending");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) { setStatus("error"); setMessage(t("noToken")); }
  }, [token, t]);

  async function handleConfirm() {
    if (!token) return;
    setStatus("loading");
    try {
      await api.auth.verifyEmail(token);
      setMessage(t("success"));
      setStatus("success");
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : t("failed"));
      setStatus("error");
    }
  }

  return (
    <main className="auth-bg flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-card border border-line bg-surface p-8 text-center" style={{ boxShadow: "var(--sh-lg)" }}>

        <span className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-card bg-brand font-display text-xl font-bold text-white">S</span>
        <h1 className="mb-6 font-display text-2xl font-semibold text-[var(--clr-text)]">{t("title")}</h1>

        {status === "pending" && (
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-[var(--clr-text-2)]">{t("confirmPrompt")}</p>
            <button
              onClick={handleConfirm}
              className="rounded-lg bg-brand px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-mid"
            >
              {t("confirmButton")}
            </button>
          </div>
        )}

        {status === "loading" && (
          <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-brand border-t-transparent" />
            <p className="text-sm text-[var(--clr-text-2)]">{t("loading")}</p>
          </div>
        )}

        {status === "success" && (
          <>
            <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--clr-ok-dim)]">
              <svg className="h-7 w-7 text-[var(--clr-ok)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="mb-6 text-sm text-[var(--clr-text-2)]">{message}</p>
            <Link href="/login" className="inline-block rounded-lg bg-brand px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-mid">
              {t("toLogin")}
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--clr-danger-dim)]">
              <svg className="h-7 w-7 text-[var(--clr-danger)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="mb-6 text-sm text-[var(--clr-danger)]">{message}</p>
            <Link href="/login" className="inline-block rounded-lg border border-line bg-surface-2 px-6 py-2.5 text-sm font-semibold text-[var(--clr-text-2)] transition hover:text-[var(--clr-text)]">
              {t("toLogin")}
            </Link>
          </>
        )}
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-[3px] border-brand border-t-transparent" /></div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
