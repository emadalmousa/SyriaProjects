import type { ProjectCategory } from "@/types";

export const CATEGORY_LABELS: Record<string, string> = {
  FOOD: "Lebensmittel", AGRICULTURE: "Landwirtschaft", TRADE: "Handel",
  HANDMADE: "Handwerk", EDUCATION: "Bildung", HEALTH: "Gesundheit",
  TRANSPORT: "Transport", TECHNOLOGY: "Technologie", REPAIR_SERVICE: "Reparaturdienst",
  SMALL_SHOP: "Kleiner Laden", RESTAURANT: "Restaurant", CAFE: "Café",
  CLOTHING: "Kleidung", CONSTRUCTION: "Bauwesen", SOLAR_ENERGY: "Solarenergie",
  WOMEN_BUSINESS: "Frauen-Business", YOUTH_PROJECT: "Jugendprojekt", OTHER: "Sonstiges",
};

export const CATEGORY_ICONS: Record<string, string> = {
  FOOD: "🥗", AGRICULTURE: "🌾", TRADE: "🛒", HANDMADE: "🪡", EDUCATION: "📚",
  HEALTH: "🏥", TRANSPORT: "🚛", TECHNOLOGY: "💻", REPAIR_SERVICE: "🔧",
  SMALL_SHOP: "🏪", RESTAURANT: "🍽️", CAFE: "☕", CLOTHING: "👗",
  CONSTRUCTION: "🏗️", SOLAR_ENERGY: "☀️", WOMEN_BUSINESS: "👩‍💼",
  YOUTH_PROJECT: "🎓", OTHER: "📦",
};

export const CATEGORIES: { value: ProjectCategory; label: string }[] = [
  { value: "FOOD",          label: "Lebensmittel / Bäckerei" },
  { value: "AGRICULTURE",   label: "Landwirtschaft" },
  { value: "TRADE",         label: "Handel" },
  { value: "HANDMADE",      label: "Handwerk" },
  { value: "EDUCATION",     label: "Bildung" },
  { value: "HEALTH",        label: "Gesundheit" },
  { value: "TRANSPORT",     label: "Transport" },
  { value: "TECHNOLOGY",    label: "Technologie" },
  { value: "REPAIR_SERVICE",label: "Reparaturservice" },
  { value: "SMALL_SHOP",    label: "Kleiner Laden" },
  { value: "RESTAURANT",    label: "Restaurant" },
  { value: "CAFE",          label: "Café" },
  { value: "CLOTHING",      label: "Bekleidung" },
  { value: "CONSTRUCTION",  label: "Bau" },
  { value: "SOLAR_ENERGY",  label: "Solarenergie" },
  { value: "WOMEN_BUSINESS",label: "Frauenprojekt" },
  { value: "YOUTH_PROJECT", label: "Jugendprojekt" },
  { value: "OTHER",         label: "Sonstiges" },
];

export function CategoryBadge({ category }: { category: string }) {
  return (
    <span className="flex items-center gap-1 rounded-pill bg-[var(--clr-info-dim)] px-3 py-1 text-xs font-medium text-[var(--clr-info)] dark:bg-blue-900/30 dark:text-blue-300">
      {CATEGORY_ICONS[category] ?? "📦"} {CATEGORY_LABELS[category] ?? category}
    </span>
  );
}
