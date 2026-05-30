"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { api } from "@/lib/api";
import { saveToken } from "@/lib/auth";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const registeredParam = searchParams.get("registered");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setShowResend(false);
    setResendSent(false);
    setLoading(true);
    try {
      const data = await api.auth.login(email, password);
      saveToken(data.access_token);
      router.push("/dashboard");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Login fehlgeschlagen";
      if (message === "EMAIL_NOT_VERIFIED") {
        setError("EMAIL_NOT_VERIFIED");
        setShowResend(true);
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    try {
      const result = await signIn("google", { redirect: false });
      if (result?.error) {
        setError("Google Login fehlgeschlagen");
        setGoogleLoading(false);
        return;
      }
      const { getSession } = await import("next-auth/react");
      const session = await getSession();
      const googleIdToken = (session as { googleIdToken?: string } | null)?.googleIdToken;
      if (googleIdToken) {
        const data = await api.auth.googleLogin(googleIdToken);
        saveToken(data.access_token);
        router.push("/dashboard");
      }
    } catch {
      setError("Google Login fehlgeschlagen");
      setGoogleLoading(false);
    }
  }

  async function handleResend() {
    setResendLoading(true);
    try {
      await api.auth.resendVerification(email);
      setResendSent(true);
    } catch {
      setResendSent(true);
    } finally {
      setResendLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Willkommen zurück</h1>
          <p className="mt-1 text-sm text-gray-500">Melde dich bei SyriaProjects an</p>
        </div>

        {registeredParam === "1" && (
          <div className="mb-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
            Registrierung erfolgreich! Bitte bestätige deine E-Mail-Adresse.
          </div>
        )}

        {error === "EMAIL_NOT_VERIFIED" ? (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            <p>Bitte bestätige zuerst deine E-Mail-Adresse.</p>
            {showResend && !resendSent && (
              <button
                onClick={handleResend}
                disabled={resendLoading}
                className="mt-2 font-medium text-blue-600 hover:underline disabled:opacity-50"
              >
                {resendLoading ? "Wird gesendet..." : "Bestätigungs-E-Mail erneut senden"}
              </button>
            )}
            {resendSent && (
              <p className="mt-2 text-green-700">Bestätigungs-E-Mail wurde erneut gesendet.</p>
            )}
          </div>
        ) : error ? (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
        ) : null}

        {/* Google Login */}
        <button
          onClick={handleGoogle}
          disabled={googleLoading}
          className="mb-4 flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {googleLoading ? "Laden..." : "Mit Google anmelden"}
        </button>

        <div className="mb-4 flex items-center gap-3">
          <div className="flex-1 border-t border-gray-200" />
          <span className="text-xs text-gray-400">oder</span>
          <div className="flex-1 border-t border-gray-200" />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">E-Mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="deine@email.de"
              className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Passwort</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="text-right">
            <Link href="/forgot-password" className="text-sm font-medium text-blue-600 hover:underline">
              Passwort vergessen?
            </Link>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-blue-600 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Laden..." : "Anmelden"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Noch kein Konto?{" "}
          <Link href="/register" className="font-medium text-blue-600 hover:underline">
            Kostenlos registrieren
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-gray-50"><p className="text-sm text-gray-500">Laden...</p></div>}>
      <LoginContent />
    </Suspense>
  );
}
