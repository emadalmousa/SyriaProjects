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
              <span className="hidden text-sm text-gray-500 dark:text-gray-400 sm:block">
                {user.full_name || user.email}
              </span>
              <Link
                href="/profile"
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                Profil bearbeiten
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
