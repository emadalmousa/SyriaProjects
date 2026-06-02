"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function HomePage() {
  const t = useTranslations("common");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6">
      <h1 className="text-4xl font-bold">SyriaProjects</h1>
      <p className="text-gray-500">{t("home.subtitle")}</p>
      <div className="flex gap-4">
        <Link href="/login" className="rounded bg-brand px-6 py-2 text-white hover:bg-brand-mid">
          {t("home.login")}
        </Link>
        <Link href="/register" className="rounded border border-brand px-6 py-2 text-brand hover:bg-brand-dim">
          {t("home.register")}
        </Link>
      </div>
    </main>
  );
}
