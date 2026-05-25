"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { formatMoney, formatPercent } from "@/lib/format";
import type { User, Project, ProjectCategory, ProjectStatus } from "@/types";

// ── Labels ──────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Entwurf", IDEA: "Idee", UNDER_REVIEW: "In Prüfung",
  NEEDS_MORE_INFO: "Mehr Infos nötig", FINANCIAL_PLAN_REQUIRED: "Finanzplan erforderlich",
  FINANCIAL_PLAN_PAID: "Finanzplan bezahlt", FINANCIAL_PLAN_DONE: "Finanzplan fertig",
  APPROVED: "Genehmigt", INTEREST_RECEIVED: "Interesse erhalten",
  CONTRACT: "Vertrag", FUNDED: "Finanziert", ACTIVE: "Aktiv",
  PAUSED: "Pausiert", COMPLETED: "Abgeschlossen", SOLD: "Verkauft",
  REJECTED: "Abgelehnt", CANCELLED: "Abgebrochen",
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  APPROVED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  FUNDED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  CONTRACT: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  PAUSED: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  COMPLETED: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
  IDEA: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
};

const CATEGORY_LABELS: Record<string, string> = {
  FOOD: "Lebensmittel", AGRICULTURE: "Landwirtschaft", TRADE: "Handel",
  HANDMADE: "Handwerk", EDUCATION: "Bildung", HEALTH: "Gesundheit",
  TRANSPORT: "Transport", TECHNOLOGY: "Technologie", REPAIR_SERVICE: "Reparaturdienst",
  SMALL_SHOP: "Kleiner Laden", RESTAURANT: "Restaurant", CAFE: "Café",
  CLOTHING: "Kleidung", CONSTRUCTION: "Bauwesen", SOLAR_ENERGY: "Solarenergie",
  WOMEN_BUSINESS: "Frauen-Business", YOUTH_PROJECT: "Jugendprojekt", OTHER: "Sonstiges",
};

const CATEGORY_ICONS: Record<string, string> = {
  FOOD: "🥗", AGRICULTURE: "🌾", TRADE: "🛒", HANDMADE: "🪡", EDUCATION: "📚",
  HEALTH: "🏥", TRANSPORT: "🚛", TECHNOLOGY: "💻", REPAIR_SERVICE: "🔧",
  SMALL_SHOP: "🏪", RESTAURANT: "🍽️", CAFE: "☕", CLOTHING: "👗",
  CONSTRUCTION: "🏗️", SOLAR_ENERGY: "☀️", WOMEN_BUSINESS: "👩‍💼",
  YOUTH_PROJECT: "🎓", OTHER: "📦",
};

const CAPITAL_BUCKETS = [
  { label: "Bis 5.000 €", min: 0, max: 5000 },
  { label: "5.000 – 20.000 €", min: 5000, max: 20000 },
  { label: "20.000 – 50.000 €", min: 20000, max: 50000 },
  { label: "50.000 – 100.000 €", min: 50000, max: 100000 },
  { label: "Über 100.000 €", min: 100000, max: Infinity },
];

// ── Filter State ─────────────────────────────────────────────────────────────

interface Filters {
  categories: Set<string>;
  statuses: Set<string>;
  capitalBuckets: Set<number>;
  countries: Set<string>;
  cities: Set<string>;
  districts: Set<string>;
}

function emptyFilters(): Filters {
  return { categories: new Set(), statuses: new Set(), capitalBuckets: new Set(), countries: new Set(), cities: new Set(), districts: new Set() };
}

function countFilters(f: Filters) {
  return f.categories.size + f.statuses.size + f.capitalBuckets.size + f.countries.size + f.cities.size + f.districts.size;
}

// ── Accordion Section ────────────────────────────────────────────────────────

function FilterSection({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-b border-gray-200 dark:border-gray-700 py-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="flex items-center gap-2 font-semibold text-gray-800 dark:text-gray-100 text-sm">
          {title}
          {count ? (
            <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] text-white leading-none">{count}</span>
          ) : null}
        </span>
        <span className="text-gray-400 text-xs">{open ? "▲" : "▼"}</span>
      </button>
      {open && <div className="mt-3 space-y-1.5">{children}</div>}
    </div>
  );
}

// ── Checkbox Row ─────────────────────────────────────────────────────────────

function FilterCheck({
  id, label, sublabel, checked, onChange,
}: { id: string; label: string; sublabel?: string; checked: boolean; onChange: () => void }) {
  return (
    <label
      htmlFor={id}
      className={`flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors
        ${checked ? "bg-blue-50 dark:bg-blue-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-700/40"}`}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 rounded accent-blue-600 cursor-pointer"
      />
      <span className={`flex-1 ${checked ? "text-blue-700 dark:text-blue-300 font-medium" : "text-gray-700 dark:text-gray-300"}`}>
        {label}
      </span>
      {sublabel && <span className="text-xs text-gray-400">{sublabel}</span>}
    </label>
  );
}

const ALL_STATUSES = [
  "DRAFT", "IDEA", "UNDER_REVIEW", "NEEDS_MORE_INFO",
  "FINANCIAL_PLAN_REQUIRED", "FINANCIAL_PLAN_PAID", "FINANCIAL_PLAN_DONE",
  "APPROVED", "INTEREST_RECEIVED", "CONTRACT", "FUNDED",
  "ACTIVE", "PAUSED", "COMPLETED", "SOLD", "REJECTED", "CANCELLED",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function serialNumber(id: number) {
  return "#" + String(id).padStart(5, "0");
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(emptyFilters());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusUpdating, setStatusUpdating] = useState<number | null>(null);

  useEffect(() => {
    api.users.me()
      .then((u) => {
        setUser(u as User);
        return api.projects.list();
      })
      .then((p) => {
        setProjects((p as Project[]).sort((a, b) => b.id - a.id));
      })
      .catch(() => router.push("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  // ── Derived data for filter options ──────────────────────────────────────

  const availableCategories = useMemo(() => {
    const seen = new Set<string>();
    projects.forEach((p) => seen.add(p.category));
    return Array.from(seen).sort();
  }, [projects]);

  const availableStatuses = useMemo(() => {
    const seen = new Set<string>();
    projects.forEach((p) => seen.add(p.status));
    return Array.from(seen).sort();
  }, [projects]);

  const availableCountries = useMemo(() => {
    const seen = new Set<string>();
    projects.forEach((p) => { if (p.country) seen.add(p.country); });
    return Array.from(seen).sort();
  }, [projects]);

  const availableCities = useMemo(() => {
    const seen = new Set<string>();
    projects.forEach((p) => { if (p.city) seen.add(p.city); });
    return Array.from(seen).sort();
  }, [projects]);

  const availableDistricts = useMemo(() => {
    const seen = new Set<string>();
    projects.forEach((p) => { if (p.district) seen.add(p.district); });
    return Array.from(seen).sort();
  }, [projects]);

  // ── Filtered results ──────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter((p) => {
      if (filters.categories.size > 0 && !filters.categories.has(p.category)) return false;
      if (filters.statuses.size > 0 && !filters.statuses.has(p.status)) return false;
      if (filters.countries.size > 0 && (!p.country || !filters.countries.has(p.country))) return false;
      if (filters.cities.size > 0 && (!p.city || !filters.cities.has(p.city))) return false;
      if (filters.districts.size > 0 && (!p.district || !filters.districts.has(p.district))) return false;
      if (filters.capitalBuckets.size > 0) {
        const match = Array.from(filters.capitalBuckets).some((i) => {
          const b = CAPITAL_BUCKETS[i];
          return p.needed_capital >= b.min && p.needed_capital < b.max;
        });
        if (!match) return false;
      }
      if (q) {
        const serial = String(p.id).padStart(5, "0");
        const haystack = [
          p.title,
          p.short_description ?? "",
          serial,
          p.city ?? "",
          p.country ?? "",
          p.district ?? "",
          CATEGORY_LABELS[p.category] ?? p.category,
          STATUS_LABELS[p.status] ?? p.status,
        ].join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [projects, filters, search]);

  // ── Toggle helpers ────────────────────────────────────────────────────────

  function toggle<T>(set: Set<T>, val: T): Set<T> {
    const next = new Set(set);
    next.has(val) ? next.delete(val) : next.add(val);
    return next;
  }

  function setCategory(v: string) { setFilters((f) => ({ ...f, categories: toggle(f.categories, v) })); }
  function setStatus(v: string) { setFilters((f) => ({ ...f, statuses: toggle(f.statuses, v) })); }
  function setBucket(v: number) { setFilters((f) => ({ ...f, capitalBuckets: toggle(f.capitalBuckets, v) })); }
  function setCountry(v: string) { setFilters((f) => ({ ...f, countries: toggle(f.countries, v) })); }
  function setCity(v: string) { setFilters((f) => ({ ...f, cities: toggle(f.cities, v) })); }
  function setDistrict(v: string) { setFilters((f) => ({ ...f, districts: toggle(f.districts, v) })); }

  async function handleStatusChange(projectId: number, newStatus: string) {
    setStatusUpdating(projectId);
    try {
      await api.projects.updateStatus(projectId, newStatus);
      setProjects((prev) =>
        prev.map((p) => p.id === projectId ? { ...p, status: newStatus as Project["status"] } : p)
      );
    } catch {
      // silent — user stays on page
    } finally {
      setStatusUpdating(null);
    }
  }

  const isAdmin = user?.global_role === "ADMIN";
  const activeCount = countFilters(filters);

  // ── Active filter chips ───────────────────────────────────────────────────

  const chips: { label: string; onRemove: () => void }[] = [
    ...Array.from(filters.categories).map((v) => ({
      label: `${CATEGORY_ICONS[v] ?? ""} ${CATEGORY_LABELS[v] ?? v}`,
      onRemove: () => setCategory(v),
    })),
    ...Array.from(filters.statuses).map((v) => ({
      label: STATUS_LABELS[v] ?? v,
      onRemove: () => setStatus(v),
    })),
    ...Array.from(filters.capitalBuckets).map((i) => ({
      label: CAPITAL_BUCKETS[i].label,
      onRemove: () => setBucket(i),
    })),
    ...Array.from(filters.countries).map((v) => ({
      label: `🌍 ${v}`,
      onRemove: () => setCountry(v),
    })),
    ...Array.from(filters.cities).map((v) => ({
      label: `🏙️ ${v}`,
      onRemove: () => setCity(v),
    })),
    ...Array.from(filters.districts).map((v) => ({
      label: `📍 ${v}`,
      onRemove: () => setDistrict(v),
    })),
  ];

  if (loading || !user) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  // ── Sidebar content ───────────────────────────────────────────────────────

  const sidebar = (
    <aside className="w-64 shrink-0">
      <div className="sticky top-20 rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold text-gray-900 dark:text-white">Filter</h2>
          {activeCount > 0 && (
            <button
              onClick={() => setFilters(emptyFilters())}
              className="text-xs text-blue-600 hover:underline dark:text-blue-400"
            >
              Alle zurücksetzen
            </button>
          )}
        </div>

        {/* Kategorie */}
        <FilterSection title="Kategorie" count={filters.categories.size}>
          {availableCategories.map((cat) => (
            <FilterCheck
              key={cat}
              id={`cat-${cat}`}
              label={`${CATEGORY_ICONS[cat] ?? ""} ${CATEGORY_LABELS[cat] ?? cat}`}
              checked={filters.categories.has(cat)}
              onChange={() => setCategory(cat)}
            />
          ))}
          {availableCategories.length === 0 && (
            <p className="text-xs text-gray-400 px-2">Keine Kategorien</p>
          )}
        </FilterSection>

        {/* Status */}
        <FilterSection title="Status" count={filters.statuses.size}>
          {availableStatuses.map((st) => (
            <FilterCheck
              key={st}
              id={`st-${st}`}
              label={STATUS_LABELS[st] ?? st}
              checked={filters.statuses.has(st)}
              onChange={() => setStatus(st)}
            />
          ))}
        </FilterSection>

        {/* Finanzierungsbedarf */}
        <FilterSection title="Finanzierungsbedarf" count={filters.capitalBuckets.size}>
          {CAPITAL_BUCKETS.map((b, i) => (
            <FilterCheck
              key={i}
              id={`cap-${i}`}
              label={b.label}
              checked={filters.capitalBuckets.has(i)}
              onChange={() => setBucket(i)}
            />
          ))}
        </FilterSection>

        {/* Land */}
        {availableCountries.length > 0 && (
          <FilterSection title="Land" count={filters.countries.size}>
            {availableCountries.map((c) => (
              <FilterCheck
                key={c}
                id={`country-${c}`}
                label={`🌍 ${c}`}
                checked={filters.countries.has(c)}
                onChange={() => setCountry(c)}
              />
            ))}
          </FilterSection>
        )}

        {/* Stadt */}
        {availableCities.length > 0 && (
          <FilterSection title="Stadt" count={filters.cities.size}>
            {availableCities.map((c) => (
              <FilterCheck
                key={c}
                id={`city-${c}`}
                label={`🏙️ ${c}`}
                checked={filters.cities.has(c)}
                onChange={() => setCity(c)}
              />
            ))}
          </FilterSection>
        )}

        {/* Ort / Bezirk */}
        {availableDistricts.length > 0 && (
          <FilterSection title="Ort / Bezirk" count={filters.districts.size}>
            {availableDistricts.map((d) => (
              <FilterCheck
                key={d}
                id={`district-${d}`}
                label={`📍 ${d}`}
                checked={filters.districts.has(d)}
                onChange={() => setDistrict(d)}
              />
            ))}
          </FilterSection>
        )}
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">

      {/* ── Sticky search bar ──────────────────────────────────────────── */}
      <div className="sticky top-[65px] z-40 border-b border-gray-200 bg-white/95 backdrop-blur dark:border-gray-700 dark:bg-gray-900/95">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Projekt suchen — nach Name, #00042, Stadt, Kategorie …"
              className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:focus:border-blue-500 dark:focus:ring-blue-800/30"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                aria-label="Suche löschen"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* Top bar */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Willkommen, {user.full_name || user.email}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link
                href="/management"
                className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-100 dark:border-rose-700 dark:bg-rose-900/20 dark:text-rose-400 dark:hover:bg-rose-900/30"
              >
                🛡️ Admin-Bereich
              </Link>
            )}
            <Link
              href="/projects/create"
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 active:scale-95 transition-transform"
            >
              + Neues Projekt
            </Link>
          </div>
        </div>

        {/* Mobile filter toggle */}
        <button
          className="mb-4 flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm lg:hidden dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M3 10h12M3 16h6" />
          </svg>
          Filter
          {activeCount > 0 && (
            <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] text-white">{activeCount}</span>
          )}
        </button>

        <div className="flex gap-6">
          {/* Sidebar – desktop always visible, mobile toggleable */}
          <div className={`${sidebarOpen ? "block" : "hidden"} lg:block`}>
            {sidebar}
          </div>

          {/* Main content */}
          <div className="min-w-0 flex-1">

            {/* Active filter chips + result count */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {filtered.length} {filtered.length === 1 ? "Projekt" : "Projekte"}
              </span>
              {chips.map((chip, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                >
                  {chip.label}
                  <button
                    onClick={chip.onRemove}
                    className="ml-0.5 rounded-full hover:text-blue-900 dark:hover:text-blue-100"
                    aria-label="Filter entfernen"
                  >
                    ×
                  </button>
                </span>
              ))}
              {activeCount > 1 && (
                <button
                  onClick={() => setFilters(emptyFilters())}
                  className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 underline"
                >
                  Alle löschen
                </button>
              )}
            </div>

            {/* Project list */}
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white py-16 dark:border-gray-600 dark:bg-gray-800">
                <span className="text-4xl mb-3">🔍</span>
                <p className="text-gray-500 dark:text-gray-400 font-medium">Keine Projekte gefunden</p>
                <button
                  onClick={() => setFilters(emptyFilters())}
                  className="mt-3 text-sm text-blue-600 hover:underline dark:text-blue-400"
                >
                  Filter zurücksetzen
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filtered.map((p) => (
                  <div
                    key={p.id}
                    className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-blue-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-600"
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Left: title + meta — clickable to detail */}
                      <Link href={`/projects/${p.id}`} className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {p.category && (
                            <span className="text-base">{CATEGORY_ICONS[p.category] ?? "📦"}</span>
                          )}
                          <h2 className="truncate text-lg font-semibold text-gray-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
                            {p.title}
                          </h2>
                          <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-400 dark:bg-gray-700 dark:text-gray-500">
                            {serialNumber(p.id)}
                          </span>
                        </div>
                        {p.short_description && (
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                            {p.short_description}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-400 dark:text-gray-500">
                          {p.city && (
                            <span className="flex items-center gap-1">
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              </svg>
                              {p.city}{p.country ? `, ${p.country}` : ""}
                            </span>
                          )}
                          {p.needed_capital > 0 && (
                            <span className="flex items-center gap-1">
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {formatMoney(p.needed_capital, p.currency)}
                            </span>
                          )}
                          {p.funding_progress > 0 && (
                            <span className="flex items-center gap-1 text-emerald-500">
                              {formatPercent(p.funding_progress)} finanziert
                            </span>
                          )}
                        </div>
                      </Link>

                      {/* Right: status badge or admin controls */}
                      <div className="shrink-0 flex flex-col items-end gap-2">
                        {isAdmin ? (
                          <>
                            {/* Status dropdown */}
                            <div className="relative">
                              <select
                                value={p.status}
                                disabled={statusUpdating === p.id}
                                onChange={(e) => handleStatusChange(p.id, e.target.value)}
                                className={`cursor-pointer appearance-none rounded-full border py-1 pl-3 pr-7 text-xs font-medium outline-none transition-opacity
                                  ${statusUpdating === p.id ? "opacity-50" : ""}
                                  ${STATUS_COLORS[p.status] ?? "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700"}
                                  border-current/20 focus:ring-2 focus:ring-blue-300`}
                              >
                                {ALL_STATUSES.map((s) => (
                                  <option key={s} value={s} className="bg-white text-gray-900 dark:bg-gray-800 dark:text-white">
                                    {STATUS_LABELS[s]}
                                  </option>
                                ))}
                              </select>
                              <svg className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                              {statusUpdating === p.id && (
                                <span className="absolute -right-5 top-1/2 -translate-y-1/2">
                                  <svg className="h-3 w-3 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                  </svg>
                                </span>
                              )}
                            </div>
                            {/* Edit button */}
                            <Link
                              href={`/projects/${p.id}`}
                              className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-600 hover:border-blue-400 hover:text-blue-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:border-blue-500 dark:hover:text-blue-400"
                            >
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Bearbeiten
                            </Link>
                          </>
                        ) : (
                          <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLORS[p.status] ?? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"}`}>
                            {STATUS_LABELS[p.status] || p.status}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Funding progress bar */}
                    {p.funding_progress > 0 && (
                      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all"
                          style={{ width: `${Math.min(p.funding_progress, 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
