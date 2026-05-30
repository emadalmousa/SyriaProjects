"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import type { User } from "@/types";

export default function Header() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    api.users.me().then((u) => setUser(u as User)).catch(() => {});
    setDark(document.documentElement.classList.contains("dark"));
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

  return (
    <header className="sticky top-0 z-50 border-b bg-white shadow-sm dark:bg-gray-900 dark:border-gray-700">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/dashboard" className="text-lg font-bold text-blue-600">
          SyriaProjects
        </Link>

        <div className="flex items-center gap-3">
          {user && (
            <>
              <Link
                href="/profile"
                className="group relative flex items-center justify-center"
                title="Profil bearbeiten"
              >
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover ring-2 ring-transparent group-hover:ring-blue-400 transition" />
                ) : (
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white transition ring-2 ring-transparent group-hover:ring-blue-400 ${
                    ["bg-blue-500","bg-violet-500","bg-emerald-500","bg-amber-500","bg-rose-500","bg-cyan-500"][user.id % 6]
                  }`}>
                    {[user.first_name, user.last_name].filter(Boolean).map((n) => n![0].toUpperCase()).join("") || user.email[0].toUpperCase()}
                  </div>
                )}
                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition pointer-events-none">
                  Profil bearbeiten
                </span>
              </Link>
              <button
                onClick={logout}
                className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400"
              >
                Abmelden
              </button>
            </>
          )}
          <button
            onClick={toggleDark}
            className="rounded-lg border border-gray-300 p-2 text-sm hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
            title="Dark Mode umschalten"
          >
            {dark ? "☀️" : "🌙"}
          </button>
        </div>
      </div>
    </header>
  );
}
