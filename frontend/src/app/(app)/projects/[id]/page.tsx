"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { formatMoney, formatPercent } from "@/lib/format";
import type { Project, ProjectBudgetItem, ProjectMilestone, ProjectUpdate } from "@/types";

const CATEGORY_LABELS: Record<string, string> = {
  FOOD: "Lebensmittel", AGRICULTURE: "Landwirtschaft", TRADE: "Handel",
  HANDMADE: "Handwerk", EDUCATION: "Bildung", HEALTH: "Gesundheit",
  TRANSPORT: "Transport", TECHNOLOGY: "Technologie", REPAIR_SERVICE: "Reparatur",
  SMALL_SHOP: "Kleiner Laden", RESTAURANT: "Restaurant", CAFE: "Café",
  CLOTHING: "Bekleidung", CONSTRUCTION: "Bau", SOLAR_ENERGY: "Solar",
  WOMEN_BUSINESS: "Frauenprojekt", YOUTH_PROJECT: "Jugendprojekt", OTHER: "Sonstiges",
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Entwurf", IDEA: "Idee", UNDER_REVIEW: "In Prüfung", APPROVED: "Genehmigt",
  ACTIVE: "Aktiv", FUNDED: "Finanziert", COMPLETED: "Abgeschlossen", REJECTED: "Abgelehnt",
};

const MILESTONE_STATUS: Record<string, string> = {
  PLANNED: "Geplant", IN_PROGRESS: "In Arbeit", DONE: "Erledigt",
  DELAYED: "Verzögert", CANCELLED: "Abgebrochen",
};

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const [project, setProject] = useState<Project | null>(null);
  const [budgetItems, setBudgetItems] = useState<ProjectBudgetItem[]>([]);
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
  const [updates, setUpdates] = useState<ProjectUpdate[]>([]);

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

  if (!project) return <p className="p-8 dark:text-white">Laden...</p>;

  const fundingPct = Math.min(project.funding_progress, 100);

  return (
    <main className="p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 shadow-sm hover:border-gray-400 hover:text-gray-900 transition-colors dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-gray-400 dark:hover:text-white"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Dashboard
          </Link>
          <h1 className="text-2xl font-bold dark:text-white">{project.title}</h1>
        </div>

        {/* Header Card */}
        <div className="mb-6 rounded-xl border bg-white p-6 shadow-sm dark:bg-gray-800 dark:border-gray-700">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-2 flex gap-2">
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                  {CATEGORY_LABELS[project.category] || project.category}
                </span>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                  {STATUS_LABELS[project.status] || project.status}
                </span>
              </div>
              <p className="text-gray-500 dark:text-gray-400">📍 {project.city}{project.district ? `, ${project.district}` : ""}, {project.country}</p>
              {project.short_description && <p className="mt-2 text-gray-600 dark:text-gray-300">{project.short_description}</p>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

          {/* Budget */}
          <div className="rounded-xl border bg-white p-6 shadow-sm dark:bg-gray-800 dark:border-gray-700">
            <h2 className="mb-4 text-lg font-semibold dark:text-white">Budget</h2>
            <div className="mb-4">
              <div className="mb-1 flex justify-between text-sm dark:text-gray-300">
                <span>Fortschritt</span><span>{formatPercent(fundingPct)}</span>
              </div>
              <div className="h-3 rounded-full bg-gray-200 dark:bg-gray-600">
                <div className="h-3 rounded-full bg-blue-500" style={{ width: `${fundingPct}%` }} />
              </div>
            </div>
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between dark:text-gray-300"><span>Gesamtbudget</span><span className="font-semibold">{formatMoney(project.total_budget, project.currency)}</span></div>
              <div className="flex justify-between dark:text-gray-300"><span>Eigenkapital</span><span className="font-semibold text-green-600">{formatMoney(project.own_capital, project.currency)}</span></div>
              <div className="flex justify-between dark:text-gray-300"><span>Benötigt</span><span className="font-semibold text-orange-600">{formatMoney(project.needed_capital, project.currency)}</span></div>
              {project.expected_monthly_revenue && <div className="flex justify-between dark:text-gray-300"><span>Erw. Umsatz/Monat</span><span>{formatMoney(project.expected_monthly_revenue, project.currency)}</span></div>}
              {project.expected_monthly_profit && <div className="flex justify-between dark:text-gray-300"><span>Erw. Gewinn/Monat</span><span>{formatMoney(project.expected_monthly_profit, project.currency)}</span></div>}
              {project.expected_duration_months && <div className="flex justify-between dark:text-gray-300"><span>Laufzeit</span><span>{project.expected_duration_months} Monate</span></div>}
            </div>
          </div>

          {/* Projektidee */}
          <div className="rounded-xl border bg-white p-6 shadow-sm dark:bg-gray-800 dark:border-gray-700">
            <h2 className="mb-4 text-lg font-semibold dark:text-white">Projektidee</h2>
            {project.project_goal && <div className="mb-3"><p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Projektziel</p><p className="text-sm dark:text-gray-300">{project.project_goal}</p></div>}
            {project.target_customers && <div className="mb-3"><p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Zielkunden</p><p className="text-sm dark:text-gray-300">{project.target_customers}</p></div>}
            {project.business_model && <div><p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Geschäftsmodell</p><p className="text-sm dark:text-gray-300">{project.business_model}</p></div>}
          </div>

        </div>

        {/* Beschreibung */}
        <div className="mt-6 rounded-xl border bg-white p-6 shadow-sm dark:bg-gray-800 dark:border-gray-700">
          <h2 className="mb-3 text-lg font-semibold dark:text-white">Beschreibung</h2>
          <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">{project.description}</p>
        </div>

        {/* Budget Items */}
        {budgetItems.length > 0 && (
          <div className="mt-6 rounded-xl border bg-white p-6 shadow-sm dark:bg-gray-800 dark:border-gray-700">
            <h2 className="mb-4 text-lg font-semibold dark:text-white">Budgetpositionen</h2>
            <div className="flex flex-col gap-2">
              {budgetItems.map(item => (
                <div key={item.id} className="flex justify-between rounded-lg bg-gray-50 px-4 py-3 dark:bg-gray-700">
                  <div>
                    <span className="font-medium dark:text-white">{item.title}</span>
                    {item.is_required && <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">Pflicht</span>}
                  </div>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">{formatMoney(item.amount, item.currency)}</span>
                </div>
              ))}
              <div className="flex justify-between border-t pt-2 dark:border-gray-600">
                <span className="font-medium dark:text-white">Gesamt</span>
                <span className="font-bold dark:text-white">{formatMoney(budgetItems.reduce((s, i) => s + Number(i.amount), 0), budgetItems[0]?.currency)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Milestones */}
        {milestones.length > 0 && (
          <div className="mt-6 rounded-xl border bg-white p-6 shadow-sm dark:bg-gray-800 dark:border-gray-700">
            <h2 className="mb-4 text-lg font-semibold dark:text-white">Meilensteine</h2>
            <div className="flex flex-col gap-2">
              {milestones.map((ms, i) => (
                <div key={ms.id} className="flex items-start gap-3 rounded-lg bg-gray-50 px-4 py-3 dark:bg-gray-700">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600 dark:bg-blue-900/30">{i + 1}</span>
                  <div>
                    <p className="font-medium dark:text-white">{ms.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{MILESTONE_STATUS[ms.status] || ms.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Updates */}
        {updates.length > 0 && (
          <div className="mt-6 rounded-xl border bg-white p-6 shadow-sm dark:bg-gray-800 dark:border-gray-700">
            <h2 className="mb-4 text-lg font-semibold dark:text-white">Projekt-Updates</h2>
            <div className="flex flex-col gap-3">
              {updates.map(upd => (
                <div key={upd.id} className="rounded-lg border-l-4 border-blue-400 bg-gray-50 px-4 py-3 dark:bg-gray-700">
                  <p className="font-medium dark:text-white">{upd.title}</p>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{upd.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
