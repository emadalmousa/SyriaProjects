"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Kein Bestätigungstoken gefunden.");
      return;
    }
    api.auth
      .verifyEmail(token)
      .then((data) => {
        setMessage(data.message || "E-Mail-Adresse erfolgreich bestätigt.");
        setStatus("success");
      })
      .catch((err: unknown) => {
        setMessage(err instanceof Error ? err.message : "Bestätigung fehlgeschlagen.");
        setStatus("error");
      });
  }, [token]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">E-Mail-Bestätigung</h1>
        </div>

        {status === "loading" && (
          <p className="text-center text-sm text-gray-500">E-Mail wird bestätigt...</p>
        )}

        {status === "success" && (
          <>
            <div className="mb-6 rounded-lg bg-green-50 p-4 text-sm text-green-700">
              E-Mail-Adresse erfolgreich bestätigt! Du kannst dich jetzt anmelden.
            </div>
            <p className="text-center text-sm text-gray-500">
              <Link href="/login" className="font-medium text-blue-600 hover:underline">
                Zur Anmeldeseite
              </Link>
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-600">
              {message}
            </div>
            <p className="text-center text-sm text-gray-500">
              <Link href="/login" className="font-medium text-blue-600 hover:underline">
                Zur Anmeldeseite
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-gray-50"><p className="text-sm text-gray-500">Laden...</p></div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
