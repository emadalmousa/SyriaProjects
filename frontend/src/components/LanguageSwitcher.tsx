"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { locales, type Locale } from "@/i18n/routing";
import { Tooltip } from "@/components/ui";
import { useState, useRef, useEffect } from "react";

const LOCALE_FLAG_CODES: Record<Locale, string> = {
  de: "de",
  en: "gb",
  ar: "sy",
};

export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("common.lang");
  const tt = useTranslations("common.tooltip");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function switchLocale(next: Locale) {
    setOpen(false);
    router.replace(pathname, { locale: next });
  }

  return (
    <div className="relative" ref={ref}>
      <Tooltip text={tt("switchLanguage")} side="bottom">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex h-9 items-center gap-1.5 rounded-lg border border-[var(--clr-line)] bg-[var(--clr-surface-2)] px-2.5 text-xs font-semibold text-[var(--clr-text-2)] transition hover:text-[var(--clr-brand)] dark:bg-[var(--clr-surface)]"
          aria-label="Language"
        >
          <span className={`fi fi-${LOCALE_FLAG_CODES[locale]} text-base`} />
          <span className="hidden sm:inline">{locale.toUpperCase()}</span>
          <svg className="h-3 w-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </Tooltip>

      {open && (
        <div className="absolute end-0 top-full z-50 mt-1 w-36 rounded-lg border border-[var(--clr-line)] bg-[var(--clr-surface)] py-1 shadow-lg">
          {locales.map((loc) => (
            <button
              key={loc}
              onClick={() => switchLocale(loc)}
              className={`flex w-full items-center gap-2 px-3 py-2 text-xs transition hover:bg-[var(--clr-surface-2)]
                ${loc === locale ? "font-semibold text-[var(--clr-brand)]" : "text-[var(--clr-text-2)]"}`}
            >
              <span className={`fi fi-${LOCALE_FLAG_CODES[loc]} text-base`} />
              <span>{t(loc)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
