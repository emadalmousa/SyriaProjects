"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const isDark = stored === "dark" || (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (isDark) document.documentElement.classList.add("dark");
    setDark(isDark);
  }, []);

  function toggleDark() {
    const isDark = document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
    setDark(isDark);
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--clr-bg)]">
      <header
        className="z-50 shrink-0 border-b border-line bg-surface/95 backdrop-blur-sm"
        style={{ height: "var(--header-h)", boxShadow: "var(--sh-sm)" }}
      >
        <div className="mx-auto flex h-full max-w-screen-2xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5 select-none">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white font-display text-sm font-bold">
              S
            </span>
            <span className="hidden sm:block font-display text-base font-semibold text-[var(--clr-text)]">
              Syria<span className="text-brand">Projects</span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <button
              onClick={toggleDark}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface-2 text-[var(--clr-text-2)] transition hover:border-brand/30 hover:text-brand dark:bg-surface dark:border-line"
            >
              {dark ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m8.66-9H21M3 12H2.34M18.36 5.64l-.71.71M6.34 17.66l-.71.71M18.36 18.36l-.71-.71M6.34 6.34l-.71-.71M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0z" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        {children}
      </main>
    </div>
  );
}
