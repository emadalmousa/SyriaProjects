"use client";
import { useState } from "react";
import { CATEGORY_LABELS, CATEGORY_ICONS } from "./CategoryBadge";
import { STATUS_LABELS } from "./StatusBadge";

// ── Types ─────────────────────────────────────────────────────────────────────

export const CAPITAL_BUCKETS = [
  { label: "Bis 5.000 €",        min: 0,      max: 5000 },
  { label: "5.000 – 20.000 €",   min: 5000,   max: 20000 },
  { label: "20.000 – 50.000 €",  min: 20000,  max: 50000 },
  { label: "50.000 – 100.000 €", min: 50000,  max: 100000 },
  { label: "Über 100.000 €",     min: 100000, max: Infinity },
];

export interface ProjectFiltersState {
  categories:    Set<string>;
  statuses:      Set<string>;
  capitalBuckets: Set<number>;
  countries:     Set<string>;
  cities:        Set<string>;
  districts:     Set<string>;
}

export function emptyFilters(): ProjectFiltersState {
  return {
    categories: new Set(), statuses: new Set(), capitalBuckets: new Set(),
    countries: new Set(), cities: new Set(), districts: new Set(),
  };
}

export function countFilters(f: ProjectFiltersState): number {
  return f.categories.size + f.statuses.size + f.capitalBuckets.size
       + f.countries.size + f.cities.size + f.districts.size;
}

// ── FilterSection accordion ───────────────────────────────────────────────────

function FilterSection({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-b border-line py-3 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-[var(--clr-text)]">
          {title}
          {count ? (
            <span className="rounded-pill bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">{count}</span>
          ) : null}
        </span>
        <span
          className="text-[var(--clr-text-3)] text-xs transition-transform duration-200"
          style={{ display: "inline-block", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        >▼</span>
      </button>
      {open && <div className="mt-2 space-y-0.5">{children}</div>}
    </div>
  );
}

// ── FilterCheck ───────────────────────────────────────────────────────────────

function FilterCheck({ id, label, checked, onChange }: {
  id: string; label: string; checked: boolean; onChange: () => void;
}) {
  return (
    <label
      htmlFor={id}
      className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors
        ${checked ? "bg-brand/10 text-brand dark:bg-brand/20" : "text-[var(--clr-text-2)] hover:bg-surface-2"}`}
    >
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition
          ${checked ? "border-brand bg-brand" : "border-line-mid bg-surface"}`}
        aria-hidden
      >
        {checked && (
          <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </span>
      <input id={id} type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      <span className={checked ? "font-medium" : ""}>{label}</span>
    </label>
  );
}

// ── Main Sidebar Filters component ───────────────────────────────────────────

interface ProjectFiltersProps {
  filters: ProjectFiltersState;
  onChange: (f: ProjectFiltersState) => void;
  availableCategories: string[];
  availableStatuses:   string[];
  availableCountries:  string[];
  availableCities:     string[];
  availableDistricts:  string[];
}

export function ProjectFilters({
  filters, onChange,
  availableCategories, availableStatuses,
  availableCountries, availableCities, availableDistricts,
}: ProjectFiltersProps) {
  function toggle<T>(set: Set<T>, val: T): Set<T> {
    const n = new Set(set); n.has(val) ? n.delete(val) : n.add(val); return n;
  }

  const set = (key: keyof ProjectFiltersState, val: string | number) =>
    onChange({ ...filters, [key]: toggle(filters[key] as Set<typeof val>, val) });

  const total = countFilters(filters);

  return (
    <aside style={{ width: "var(--sidebar-w)", flexShrink: 0 }}>
      <div
        className="sticky top-4 rounded-card border border-line bg-surface px-4 py-4"
        style={{ boxShadow: "var(--sh-sm)" }}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-[var(--clr-text)]">Filter</h2>
          {total > 0 && (
            <button onClick={() => onChange(emptyFilters())} className="text-xs text-brand hover:underline">
              Zurücksetzen
            </button>
          )}
        </div>

        <FilterSection title="Kategorie" count={filters.categories.size}>
          {availableCategories.length === 0
            ? <p className="px-2 text-xs text-[var(--clr-text-3)]">Keine Kategorien</p>
            : availableCategories.map((cat) => (
                <FilterCheck
                  key={cat}
                  id={`cat-${cat}`}
                  label={`${CATEGORY_ICONS[cat] ?? ""} ${CATEGORY_LABELS[cat] ?? cat}`}
                  checked={filters.categories.has(cat)}
                  onChange={() => set("categories", cat)}
                />
              ))
          }
        </FilterSection>

        <FilterSection title="Status" count={filters.statuses.size}>
          {availableStatuses.map((st) => (
            <FilterCheck key={st} id={`st-${st}`} label={STATUS_LABELS[st] ?? st} checked={filters.statuses.has(st)} onChange={() => set("statuses", st)} />
          ))}
        </FilterSection>

        <FilterSection title="Finanzierungsbedarf" count={filters.capitalBuckets.size}>
          {CAPITAL_BUCKETS.map((b, i) => (
            <FilterCheck key={i} id={`cap-${i}`} label={b.label} checked={filters.capitalBuckets.has(i)} onChange={() => set("capitalBuckets", i)} />
          ))}
        </FilterSection>

        {availableCountries.length > 0 && (
          <FilterSection title="Land" count={filters.countries.size}>
            {availableCountries.map((c) => (
              <FilterCheck key={c} id={`country-${c}`} label={`🌍 ${c}`} checked={filters.countries.has(c)} onChange={() => set("countries", c)} />
            ))}
          </FilterSection>
        )}

        {availableCities.length > 0 && (
          <FilterSection title="Stadt" count={filters.cities.size}>
            {availableCities.map((c) => (
              <FilterCheck key={c} id={`city-${c}`} label={`🏙️ ${c}`} checked={filters.cities.has(c)} onChange={() => set("cities", c)} />
            ))}
          </FilterSection>
        )}

        {availableDistricts.length > 0 && (
          <FilterSection title="Ort / Bezirk" count={filters.districts.size}>
            {availableDistricts.map((d) => (
              <FilterCheck key={d} id={`district-${d}`} label={`📍 ${d}`} checked={filters.districts.has(d)} onChange={() => set("districts", d)} />
            ))}
          </FilterSection>
        )}
      </div>
    </aside>
  );
}
