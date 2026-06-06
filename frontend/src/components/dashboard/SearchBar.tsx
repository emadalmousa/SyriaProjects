"use client";

import { useTranslations } from "next-intl";
import { Tooltip } from "@/components/ui";

type SortKey = "newest" | "oldest" | "alpha" | "participants" | "invested" | "funding";

interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  sortKey: SortKey;
  onSortChange: (key: SortKey) => void;
}

export function SearchBar({ value, onChange, placeholder = "", sortKey, onSortChange }: SearchBarProps) {
  const tt = useTranslations("common.tooltip");
  const td = useTranslations("dashboard");

  const sortOptions: SortKey[] = ["newest", "oldest", "alpha", "participants", "invested", "funding"];

  return (
    <div className="sticky top-0 z-40 border-b border-line bg-[var(--clr-bg)]/95 backdrop-blur-sm">
      <div className="mx-auto max-w-screen-2xl px-5 py-3 sm:px-8">
        <div className="flex items-center gap-2">
          {/* Search input */}
          <div className="relative min-w-0 flex-1">
            <svg
              className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--clr-text-3)]"
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="search"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className="w-full rounded-card border border-line bg-surface py-2.5 ps-10 pe-10 text-sm text-[var(--clr-text)] placeholder-[var(--clr-text-3)] outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 dark:bg-surface"
              style={{ boxShadow: "var(--sh-xs)" }}
            />
            {value && (
              <Tooltip text={tt("clearSearch")} side="left">
                <button
                  onClick={() => onChange("")}
                  className="absolute end-3.5 top-1/2 -translate-y-1/2 text-[var(--clr-text-3)] hover:text-[var(--clr-text)]"
                  aria-label="Clear"
                >
                  {"×"}
                </button>
              </Tooltip>
            )}
          </div>

          {/* Sort dropdown */}
          <div className="relative shrink-0">
            <svg
              className="pointer-events-none absolute start-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--clr-text-3)]"
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9M3 12h5m8 0l4-4m0 0l4 4m-4-4v12" />
            </svg>
            <select
              value={sortKey}
              onChange={(e) => onSortChange(e.target.value as SortKey)}
              className="appearance-none rounded-card border border-line bg-surface py-2.5 ps-8 pe-8 text-sm font-medium text-[var(--clr-text)] outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 dark:bg-surface"
              style={{ boxShadow: "var(--sh-xs)" }}
            >
              {sortOptions.map((key) => (
                <option key={key} value={key}>
                  {td(`sort${key.charAt(0).toUpperCase() + key.slice(1)}` as Parameters<typeof td>[0])}
                </option>
              ))}
            </select>
            <svg
              className="pointer-events-none absolute end-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--clr-text-3)]"
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
