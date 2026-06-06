"use client";
import { useEffect, useState, useMemo, useRef } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import { api } from "@/lib/api";
import type { User, Project } from "@/types";

import { PageSpinner } from "@/components/ui";
import { SearchBar, FilterChips } from "@/components/dashboard";
import {
  ProjectFilters, ProjectCard,
  emptyFilters, countFilters, CAPITAL_BUCKETS,
  CATEGORY_ICONS,
} from "@/components/project";
import type { ProjectFiltersState } from "@/components/project";

type SortKey = "newest" | "oldest" | "alpha" | "participants" | "invested" | "funding";

function parseSet(param: string | null): Set<string> {
  if (!param) return new Set();
  return new Set(param.split(",").filter(Boolean));
}

function parseNumSet(param: string | null): Set<number> {
  if (!param) return new Set();
  return new Set(param.split(",").filter(Boolean).map(Number));
}

function encodeSet(s: Set<string | number>): string {
  return Array.from(s).join(",");
}

function filtersFromParams(params: URLSearchParams): ProjectFiltersState {
  return {
    categories:    parseSet(params.get("cat")),
    statuses:      parseSet(params.get("st")),
    countries:     parseSet(params.get("co")),
    cities:        parseSet(params.get("ci")),
    districts:     parseSet(params.get("di")),
    capitalBuckets: parseNumSet(params.get("cap")),
  };
}

export function DashboardView() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const t            = useTranslations("dashboard");
  const tProject     = useTranslations("project");

  const [user, setUser]       = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading]   = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState<number | null>(null);

  // Initialise from URL on first render
  const [search,  setSearch]  = useState(() => searchParams.get("q") ?? "");
  const [sortKey, setSortKey] = useState<SortKey>(() => (searchParams.get("sort") as SortKey) ?? "newest");
  const [filters, setFilters] = useState<ProjectFiltersState>(() => filtersFromParams(searchParams));

  // Sync state → URL (replace so it doesn't pollute history)
  const initialized = useRef(false);
  useEffect(() => {
    if (!initialized.current) { initialized.current = true; return; }
    const p = new URLSearchParams();
    if (search)                         p.set("q",    search);
    if (sortKey !== "newest")           p.set("sort", sortKey);
    if (filters.categories.size)        p.set("cat",  encodeSet(filters.categories));
    if (filters.statuses.size)          p.set("st",   encodeSet(filters.statuses));
    if (filters.countries.size)         p.set("co",   encodeSet(filters.countries));
    if (filters.cities.size)            p.set("ci",   encodeSet(filters.cities));
    if (filters.districts.size)         p.set("di",   encodeSet(filters.districts));
    if (filters.capitalBuckets.size)    p.set("cap",  encodeSet(filters.capitalBuckets));
    const qs = p.toString();
    router.replace((`/dashboard${qs ? `?${qs}` : ""}`) as Parameters<typeof router.replace>[0], { scroll: false });
  }, [search, sortKey, filters]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    api.users.me()
      .then((u) => { setUser(u as User); return api.projects.list(); })
      .then((p) => setProjects(p as Project[]))
      .catch(() => router.push("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  // ── Visibility filter ────────────────────────────────────────────────────

  const isAdmin         = user?.global_role === "ADMIN" || user?.global_role === "SUPERADMIN";
  const visibleProjects = isAdmin
    ? projects
    : projects.filter((p) => p.status !== "IDEA");

  // ── Derived filter options ───────────────────────────────────────────────

  const availableCategories = useMemo(() => { const s = new Set<string>(); visibleProjects.forEach((p) => s.add(p.category)); return Array.from(s).sort(); }, [visibleProjects]);
  const availableStatuses   = useMemo(() => { const s = new Set<string>(); visibleProjects.forEach((p) => s.add(p.status));   return Array.from(s).sort(); }, [visibleProjects]);
  const availableCountries  = useMemo(() => { const s = new Set<string>(); visibleProjects.forEach((p) => { if (p.country)  s.add(p.country);  }); return Array.from(s).sort(); }, [visibleProjects]);
  const availableCities     = useMemo(() => { const s = new Set<string>(); visibleProjects.forEach((p) => { if (p.city)     s.add(p.city);     }); return Array.from(s).sort(); }, [visibleProjects]);
  const availableDistricts  = useMemo(() => { const s = new Set<string>(); visibleProjects.forEach((p) => { if (p.district) s.add(p.district); }); return Array.from(s).sort(); }, [visibleProjects]);

  // ── Filtered + sorted results ────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = visibleProjects.filter((p) => {
      if (filters.categories.size > 0 && !filters.categories.has(p.category)) return false;
      if (filters.statuses.size > 0   && !filters.statuses.has(p.status))     return false;
      if (filters.countries.size > 0  && (!p.country  || !filters.countries.has(p.country)))   return false;
      if (filters.cities.size > 0     && (!p.city     || !filters.cities.has(p.city)))         return false;
      if (filters.districts.size > 0  && (!p.district || !filters.districts.has(p.district)))  return false;
      if (filters.capitalBuckets.size > 0) {
        const match = Array.from(filters.capitalBuckets).some((i) => {
          const b = CAPITAL_BUCKETS[i];
          return p.needed_capital >= b.min && p.needed_capital < b.max;
        });
        if (!match) return false;
      }
      if (q) {
        const serial = String(p.id).padStart(5, "0");
        const hay = [p.title, p.short_description ?? "", serial, p.city ?? "", p.country ?? "",
          p.district ?? "", p.category, p.status,
        ].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    return [...list].sort((a, b) => {
      if (sortKey === "newest")       return b.id - a.id;
      if (sortKey === "oldest")       return a.id - b.id;
      if (sortKey === "alpha")        return a.title.localeCompare(b.title);
      if (sortKey === "participants") return (b.participant_count ?? 0) - (a.participant_count ?? 0);
      if (sortKey === "invested")     return (b.total_invested ?? 0) - (a.total_invested ?? 0);
      if (sortKey === "funding")      return b.funding_progress - a.funding_progress;
      return 0;
    });
  }, [visibleProjects, filters, search, sortKey]);

  // ── Filter chips ─────────────────────────────────────────────────────────

  const chips = [
    ...Array.from(filters.categories).map((v) => ({ label: `${CATEGORY_ICONS[v] ?? ""} ${tProject(`category.${v}` as Parameters<typeof tProject>[0])}`, onRemove: () => setFilters((f) => ({ ...f, categories: del(f.categories, v) })) })),
    ...Array.from(filters.statuses).map((v)    => ({ label: tProject(`status.${v}` as Parameters<typeof tProject>[0]), onRemove: () => setFilters((f) => ({ ...f, statuses: del(f.statuses, v) })) })),
    ...Array.from(filters.capitalBuckets).map((i) => ({ label: tProject(`capital.bucket${i}` as Parameters<typeof tProject>[0]), onRemove: () => setFilters((f) => ({ ...f, capitalBuckets: del(f.capitalBuckets, i) })) })),
    ...Array.from(filters.countries).map((v)   => ({ label: `\u{1F30D} ${v}`, onRemove: () => setFilters((f) => ({ ...f, countries: del(f.countries, v) })) })),
    ...Array.from(filters.cities).map((v)      => ({ label: `\u{1F3D9}\u{FE0F} ${v}`, onRemove: () => setFilters((f) => ({ ...f, cities: del(f.cities, v) })) })),
    ...Array.from(filters.districts).map((v)   => ({ label: `\u{1F4CD} ${v}`, onRemove: () => setFilters((f) => ({ ...f, districts: del(f.districts, v) })) })),
  ];

  function del<T>(s: Set<T>, v: T): Set<T> { const n = new Set(s); n.delete(v); return n; }

  // ── Status update ────────────────────────────────────────────────────────

  async function handleStatusChange(projectId: number, newStatus: string) {
    setStatusUpdating(projectId);
    try {
      await api.projects.updateStatus(projectId, newStatus);
      setProjects((prev) => prev.map((p) => p.id === projectId ? { ...p, status: newStatus as Project["status"] } : p));
    } catch { /* silent */ }
    finally { setStatusUpdating(null); }
  }

  const activeCount = countFilters(filters);

  if (loading || !user) return <PageSpinner />;

  return (
    <div className="min-h-screen bg-[var(--clr-bg)]">

      {/* Sticky search + sort */}
      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder={t("searchPlaceholder")}
        sortKey={sortKey}
        onSortChange={setSortKey}
      />

      <div className="mx-auto max-w-screen-2xl px-5 py-8 sm:px-8">

        {/* Top bar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold text-[var(--clr-text)]">{t("title")}</h1>
            <p className="mt-0.5 text-sm text-[var(--clr-text-2)]">{t("welcome", { name: user.full_name || user.email })}</p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link href="/management" className="flex items-center gap-1.5 rounded-lg border border-[var(--clr-danger-dim)] bg-[var(--clr-danger-dim)] px-4 py-2 text-sm font-semibold text-[var(--clr-danger)] transition hover:bg-red-100 dark:border-red-800/40 dark:bg-red-900/20 dark:text-red-400">
                {"\u{1F6E1}\u{FE0F}"} {t("adminArea")}
              </Link>
            )}
            <Link href="/projects/create" className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-mid active:scale-95">
              {t("newProject")}
            </Link>
          </div>
        </div>

        {/* Mobile filter toggle */}
        <button
          className="mb-4 flex items-center gap-2 rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium text-[var(--clr-text-2)] transition hover:border-brand/30 hover:text-[var(--clr-text)] lg:hidden"
          style={{ boxShadow: "var(--sh-xs)" }}
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M3 10h12M3 16h6" /></svg>
          {t("filterTitle")}
          {activeCount > 0 && <span className="rounded-pill bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white">{activeCount}</span>}
        </button>

        <div className="flex gap-6">
          {/* Sidebar */}
          <div className={`${sidebarOpen ? "block" : "hidden"} lg:block`}>
            <ProjectFilters
              filters={filters}
              onChange={setFilters}
              availableCategories={availableCategories}
              availableStatuses={availableStatuses}
              availableCountries={availableCountries}
              availableCities={availableCities}
              availableDistricts={availableDistricts}
            />
          </div>

          {/* Main */}
          <div className="min-w-0 flex-1">
            <div className="mb-4">
              <FilterChips count={filtered.length} chips={chips} onClearAll={() => setFilters(emptyFilters())} />
            </div>

            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-line bg-surface py-16">
                <span className="mb-3 text-4xl">{"\u{1F50D}"}</span>
                <p className="font-medium text-[var(--clr-text-2)]">{t("noProjects")}</p>
                <button onClick={() => setFilters(emptyFilters())} className="mt-3 text-sm text-brand hover:underline">
                  {t("resetFilters")}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filtered.map((p) => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    isAdmin={isAdmin}
                    statusUpdating={statusUpdating === p.id}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
