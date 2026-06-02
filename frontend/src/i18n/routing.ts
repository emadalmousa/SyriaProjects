import { defineRouting } from "next-intl/routing";

export const locales = ["de", "en", "ar"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "de";
export const rtlLocales: Locale[] = ["ar"];

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "always",
});
