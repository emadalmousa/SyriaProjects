"use client";

import { useTranslations } from "next-intl";
import type { ProjectCategory } from "@/types";

export const CATEGORY_ICONS: Record<string, string> = {
  FOOD: "\u{1F957}", AGRICULTURE: "\u{1F33E}", TRADE: "\u{1F6D2}", HANDMADE: "\u{1FAA1}", EDUCATION: "\u{1F4DA}",
  HEALTH: "\u{1F3E5}", TRANSPORT: "\u{1F69B}", TECHNOLOGY: "\u{1F4BB}", REPAIR_SERVICE: "\u{1F527}",
  SMALL_SHOP: "\u{1F3EA}", RESTAURANT: "\u{1F37D}\u{FE0F}", CAFE: "\u{2615}", CLOTHING: "\u{1F457}",
  CONSTRUCTION: "\u{1F3D7}\u{FE0F}", SOLAR_ENERGY: "\u{2600}\u{FE0F}", WOMEN_BUSINESS: "\u{1F469}\u{200D}\u{1F4BC}",
  YOUTH_PROJECT: "\u{1F393}", OTHER: "\u{1F4E6}",
};

export const ALL_CATEGORIES: ProjectCategory[] = [
  "FOOD", "AGRICULTURE", "TRADE", "HANDMADE", "EDUCATION",
  "HEALTH", "TRANSPORT", "TECHNOLOGY", "REPAIR_SERVICE",
  "SMALL_SHOP", "RESTAURANT", "CAFE", "CLOTHING",
  "CONSTRUCTION", "SOLAR_ENERGY", "WOMEN_BUSINESS", "YOUTH_PROJECT", "OTHER",
];

export function CategoryBadge({ category }: { category: string }) {
  const t = useTranslations("project");
  return (
    <span className="flex items-center gap-1 rounded-pill bg-[var(--clr-info-dim)] px-3 py-1 text-xs font-medium text-[var(--clr-info)] dark:bg-blue-900/30 dark:text-blue-300">
      {CATEGORY_ICONS[category] ?? "\u{1F4E6}"} {t(`category.${category}` as Parameters<typeof t>[0])}
    </span>
  );
}
