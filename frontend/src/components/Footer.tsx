"use client";

import { useTranslations } from "next-intl";

export default function Footer() {
  const t = useTranslations("common");
  return (
    <footer className="shrink-0 border-t border-line bg-surface">
      <div className="mx-auto max-w-screen-2xl px-5 py-4 sm:px-8 flex items-center justify-between">
        <span className="text-xs text-[var(--clr-text-3)]">
          &copy; {new Date().getFullYear()} SyriaProjects
        </span>
        <span className="text-xs text-[var(--clr-text-3)]">
          {t("footer.tagline")}
        </span>
      </div>
    </footer>
  );
}
