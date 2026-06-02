"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { api } from "@/lib/api";
import { formatMoney, formatPercent } from "@/lib/format";
import type { Project, ProjectBudgetItem, ProjectMilestone, ProjectUpdate } from "@/types";
import { PageSpinner, Card } from "@/components/ui";
import { PageHeader } from "@/components/layout";
import { StatusBadge, CategoryBadge, FundingBar } from "@/components/project";

export function ProjectDetailView() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations("project");
  const id = Number(params.id);

  const [project, setProject]       = useState<Project | null>(null);
  const [budgetItems, setBudgetItems] = useState<ProjectBudgetItem[]>([]);
  const [milestones, setMilestones]   = useState<ProjectMilestone[]>([]);
  const [updates, setUpdates]         = useState<ProjectUpdate[]>([]);

  useEffect(() => {
    Promise.all([
      api.projects.get(id),
      api.projects.budgetItems.list(id),
      api.projects.milestones.list(id),
      api.projects.updates.list(id),
    ])
      .then(([p, bi, ms, upd]) => {
        setProject(p as Project);
        setBudgetItems(bi as ProjectBudgetItem[]);
        setMilestones(ms as ProjectMilestone[]);
        setUpdates(upd as ProjectUpdate[]);
      })
      .catch(() => router.push("/login"));
  }, [id, router]);

  if (!project) return <PageSpinner />;

  const fundingPct = Math.min(project.funding_progress, 100);

  return (
    <div className="min-h-screen bg-[var(--clr-bg)]">
      <div className="mx-auto max-w-4xl px-5 py-8 sm:px-8">

        <PageHeader title={project.title} backHref="/dashboard" backLabel={t("detail.backLabel")} />

        {/* Header Card */}
        <Card className="mb-6 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-3 flex flex-wrap gap-2">
                <CategoryBadge category={project.category} />
                <StatusBadge status={project.status} />
              </div>
              <p className="text-sm text-[var(--clr-text-2)]">
                {"\u{1F4CD}"} {project.city}{project.district ? `, ${project.district}` : ""}{project.country ? `, ${project.country}` : ""}
              </p>
              {project.short_description && (
                <p className="mt-2 text-sm text-[var(--clr-text-2)]">{project.short_description}</p>
              )}
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

          {/* Budget */}
          <Card className="p-6">
            <h2 className="mb-4 font-display text-base font-semibold text-[var(--clr-text)]">{t("detail.budget")}</h2>
            <div className="mb-4">
              <div className="mb-2 flex justify-between text-xs font-medium text-[var(--clr-text-2)]">
                <span>{t("detail.progress")}</span><span>{formatPercent(fundingPct)}</span>
              </div>
              <FundingBar progress={fundingPct} />
            </div>
            <div className="flex flex-col gap-2 text-sm">
              {[
                { label: t("detail.totalBudget"),    value: formatMoney(project.total_budget, project.currency),  cls: "" },
                { label: t("detail.ownCapital"),     value: formatMoney(project.own_capital, project.currency),   cls: "text-emerald-600 dark:text-emerald-400" },
                { label: t("detail.needed"),         value: formatMoney(project.needed_capital, project.currency), cls: "text-accent" },
                ...(project.expected_monthly_revenue ? [{ label: t("detail.monthlyRevenue"), value: formatMoney(project.expected_monthly_revenue, project.currency), cls: "" }] : []),
                ...(project.expected_monthly_profit  ? [{ label: t("detail.monthlyProfit"),  value: formatMoney(project.expected_monthly_profit, project.currency),  cls: "" }] : []),
                ...(project.expected_duration_months ? [{ label: t("detail.duration"),       value: t("detail.durationUnit", { months: project.expected_duration_months }), cls: "" }] : []),
              ].map((row) => (
                <div key={row.label} className="flex justify-between">
                  <span className="text-[var(--clr-text-2)]">{row.label}</span>
                  <span className={`font-semibold text-[var(--clr-text)] ${row.cls}`}>{row.value}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Projektidee */}
          <Card className="p-6">
            <h2 className="mb-4 font-display text-base font-semibold text-[var(--clr-text)]">{t("detail.projectIdea")}</h2>
            {[
              { key: t("detail.projectGoal"),    val: project.project_goal },
              { key: t("detail.targetCustomers"),val: project.target_customers },
              { key: t("detail.businessModel"),  val: project.business_model },
            ].filter((r) => r.val).map((r) => (
              <div key={r.key} className="mb-3 last:mb-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--clr-text-3)]">{r.key}</p>
                <p className="mt-0.5 text-sm text-[var(--clr-text-2)]">{r.val}</p>
              </div>
            ))}
          </Card>
        </div>

        {/* Beschreibung */}
        <Card className="mt-6 p-6">
          <h2 className="mb-3 font-display text-base font-semibold text-[var(--clr-text)]">{t("detail.descriptionLabel")}</h2>
          <p className="whitespace-pre-wrap text-sm text-[var(--clr-text-2)]">{project.description}</p>
        </Card>

        {/* Budgetpositionen */}
        {budgetItems.length > 0 && (
          <Card className="mt-6 p-6">
            <h2 className="mb-4 font-display text-base font-semibold text-[var(--clr-text)]">{t("detail.budgetItems")}</h2>
            <div className="flex flex-col gap-2">
              {budgetItems.map((item) => (
                <div key={item.id} className="flex justify-between rounded-lg bg-surface-2 px-4 py-3">
                  <div>
                    <span className="font-medium text-[var(--clr-text)]">{item.title}</span>
                    {item.is_required && <span className="ms-2 text-xs text-[var(--clr-text-3)]">{t("detail.required")}</span>}
                  </div>
                  <span className="font-semibold text-brand">{formatMoney(item.amount, item.currency)}</span>
                </div>
              ))}
              <div className="flex justify-between border-t border-line pt-2">
                <span className="font-medium text-[var(--clr-text)]">{t("detail.total")}</span>
                <span className="font-bold text-[var(--clr-text)]">
                  {formatMoney(budgetItems.reduce((s, i) => s + Number(i.amount), 0), budgetItems[0]?.currency)}
                </span>
              </div>
            </div>
          </Card>
        )}

        {/* Meilensteine */}
        {milestones.length > 0 && (
          <Card className="mt-6 p-6">
            <h2 className="mb-4 font-display text-base font-semibold text-[var(--clr-text)]">{t("detail.milestones")}</h2>
            <div className="flex flex-col gap-2">
              {milestones.map((ms, i) => (
                <div key={ms.id} className="flex items-start gap-3 rounded-lg bg-surface-2 px-4 py-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-bold text-brand">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-medium text-[var(--clr-text)]">{ms.title}</p>
                    <p className="text-xs text-[var(--clr-text-3)]">{t(`milestoneStatus.${ms.status}` as Parameters<typeof t>[0])}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Updates */}
        {updates.length > 0 && (
          <Card className="mt-6 p-6">
            <h2 className="mb-4 font-display text-base font-semibold text-[var(--clr-text)]">{t("detail.updates")}</h2>
            <div className="flex flex-col gap-3">
              {updates.map((upd) => (
                <div key={upd.id} className="rounded-lg border-s-4 border-brand bg-surface-2 px-4 py-3">
                  <p className="font-medium text-[var(--clr-text)]">{upd.title}</p>
                  <p className="mt-1 text-sm text-[var(--clr-text-2)]">{upd.content}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

      </div>
    </div>
  );
}
