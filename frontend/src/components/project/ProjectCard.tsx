"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatMoney, formatPercent } from "@/lib/format";
import type { Project } from "@/types";
import { StatusBadge, StatusSelect } from "./StatusBadge";
import { CATEGORY_ICONS } from "./CategoryBadge";
import { FundingBar } from "./FundingBar";

function serialNumber(id: number) {
  return "#" + String(id).padStart(5, "0");
}

interface ProjectCardProps {
  project: Project;
  isAdmin?: boolean;
  statusUpdating?: boolean;
  onStatusChange?: (projectId: number, status: string) => void;
}

export function ProjectCard({ project: p, isAdmin, statusUpdating, onStatusChange }: ProjectCardProps) {
  const t = useTranslations("project");

  return (
    <div
      className="group rounded-card border border-line bg-surface transition-all hover:border-brand/40 hover:-translate-y-px"
      style={{ boxShadow: "var(--sh-sm)" }}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">

          {/* Left - clickable area */}
          <Link href={`/projects/${p.id}`} className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {p.category && <span className="text-base">{CATEGORY_ICONS[p.category] ?? "\u{1F4E6}"}</span>}
              <h2 className="truncate font-semibold text-[var(--clr-text)] group-hover:text-brand transition-colors">
                {p.title}
              </h2>
              <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs text-[var(--clr-text-3)]">
                {serialNumber(p.id)}
              </span>
            </div>

            {p.short_description && (
              <p className="mt-1 text-sm text-[var(--clr-text-2)] line-clamp-2">{p.short_description}</p>
            )}

            <div className="mt-2.5 flex flex-wrap gap-3 text-xs text-[var(--clr-text-3)]">
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
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  {t("card.funded", { percent: formatPercent(p.funding_progress).replace("%", "") })}
                </span>
              )}
            </div>
          </Link>

          {/* Right - status */}
          <div className="shrink-0 flex flex-col items-end gap-2">
            {isAdmin && onStatusChange ? (
              <>
                <StatusSelect
                  status={p.status}
                  loading={statusUpdating}
                  onChange={(v) => onStatusChange(p.id, v)}
                />
                <Link
                  href={`/projects/${p.id}`}
                  className="flex items-center gap-1 rounded-lg border border-line bg-surface-2 px-3 py-1 text-xs font-medium text-[var(--clr-text-2)] transition hover:border-brand/30 hover:text-brand"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  {t("card.edit")}
                </Link>
              </>
            ) : (
              <StatusBadge status={p.status} />
            )}
          </div>
        </div>

        <FundingBar progress={p.funding_progress} className="mt-3.5" />
      </div>
    </div>
  );
}
