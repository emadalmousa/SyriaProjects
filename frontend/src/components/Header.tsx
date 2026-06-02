"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { api } from "@/lib/api";
import type { User } from "@/types";
import { LanguageSwitcher } from "./LanguageSwitcher";

const AVATAR_COLORS = [
  "bg-emerald-600","bg-violet-600","bg-amber-600","bg-rose-600","bg-sky-600","bg-teal-600",
];

export default function Header() {
  const router = useRouter();
  const t = useTranslations("common");
  const [user, setUser] = useState<User | null>(null);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    api.users.me().then((u) => setUser(u as User)).catch(() => {});
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

  function logout() {
    localStorage.removeItem("token");
    router.push("/login");
  }

  const initials = user
    ? [user.first_name, user.last_name].filter(Boolean).map((n) => n![0].toUpperCase()).join("") || user.email[0].toUpperCase()
    : "";
  const avatarColor = user ? AVATAR_COLORS[user.id % AVATAR_COLORS.length] : "bg-brand";

  return (
    <header
      className="z-50 shrink-0 border-b border-line bg-surface/95 backdrop-blur-sm"
      style={{ height: "var(--header-h)", boxShadow: "var(--sh-sm)" }}
    >
      <div className="mx-auto flex h-full max-w-screen-2xl items-center justify-between px-5 sm:px-8">

        {/* Brand */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 select-none"
        >
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white font-display text-sm font-bold"
            aria-hidden
          >
            S
          </span>
          <span className="hidden sm:block font-display text-base font-semibold text-[var(--clr-text)]">
            Syria<span className="text-brand">Projects</span>
          </span>
        </Link>

        {/* Right controls */}
        <div className="flex items-center gap-2">
          <LanguageSwitcher />

          {user && (
            <>
              {/* Avatar link */}
              <Link
                href="/profile"
                title={t("nav.editProfile")}
                className="group relative flex items-center justify-center rounded-full ring-2 ring-transparent hover:ring-brand/40 transition-all"
              >
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt=""
                    className="h-9 w-9 rounded-full object-cover"
                  />
                ) : (
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white ${avatarColor}`}>
                    {initials}
                  </div>
                )}
              </Link>

              {/* Logout */}
              <button
                onClick={logout}
                className="hidden sm:flex items-center gap-1.5 rounded-lg border border-[var(--clr-danger-dim)] bg-[var(--clr-danger-dim)] px-3.5 py-1.5 text-xs font-semibold text-[var(--clr-danger)] transition hover:bg-red-100 dark:border-red-800/50 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
              >
                {t("nav.logout")}
              </button>
            </>
          )}

          {/* Dark-mode toggle */}
          <button
            onClick={toggleDark}
            aria-label={t("nav.toggleDark")}
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
  );
}
