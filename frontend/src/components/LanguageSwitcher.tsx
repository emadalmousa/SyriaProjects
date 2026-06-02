"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { locales, type Locale } from "@/i18n/routing";

const LOCALE_FLAGS: Record<Locale, string> = {
  de: "\u{1F1E9}\u{1F1EA}",
  en: "\u{1F1EC}\u{1F1E7}",
  ar: "\u{1F1F8}\u{1F1FE}",
};

export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("common.lang");

  function switchLocale(next: Locale) {
    router.replace(pathname, { locale: next });
  }

  return (
    <div className="relative group">
      <button
        className="flex h-9 items-center gap-1.5 rounded-lg border border-[var(--clr-line)] bg-[var(--clr-surface-2)] px-2.5 text-xs font-semibold text-[var(--clr-text-2)] transition hover:text-[var(--clr-brand)] dark:bg-[var(--clr-surface)]"
        aria-label="Language"
      >
        <span>{LOCALE_FLAGS[locale]}</span>
        <span className="hidden sm:inline">{locale.toUpperCase()}</span>
        <svg className="h-3 w-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div className="absolute end-0 top-full z-50 mt-1 hidden w-36 rounded-lg border border-[var(--clr-line)] bg-[var(--clr-surface)] py-1 shadow-lg group-focus-within:block group-hover:block">
        {locales.map((loc) => (
          <button
            key={loc}
            onClick={() => switchLocale(loc)}
            className={`flex w-full items-center gap-2 px-3 py-2 text-xs transition hover:bg-[var(--clr-surface-2)]
              ${loc === locale ? "font-semibold text-[var(--clr-brand)]" : "text-[var(--clr-text-2)]"}`}
          >
            <span>{LOCALE_FLAGS[loc]}</span>
            <span>{t(loc)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
