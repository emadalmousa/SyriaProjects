"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { api } from "@/lib/api";
import { formatMoney, formatPercent } from "@/lib/format";
import type { Project, ProjectBudgetItem, ProjectMilestone, ProjectUpdate, User, Participant } from "@/types";
import { PageSpinner, Card, Alert } from "@/components/ui";
import { PageHeader } from "@/components/layout";
import { StatusBadge, CategoryBadge, FundingBar, ALL_CATEGORIES } from "@/components/project";
import { InputField, SelectField, TextareaField } from "@/components/ui";

const SYRIAN_GOV_EN = [
  "Damascus", "Rural Damascus", "Aleppo", "Homs", "Hama",
  "Latakia", "Tartus", "Deir ez-Zor", "Raqqa", "Idlib",
  "Daraa", "As-Suwayda", "Al-Hasakah", "Quneitra",
];
const SYRIAN_GOV_AR = [
  "دمشق", "ريف دمشق", "حلب", "حمص", "حماة",
  "اللاذقية", "طرطوس", "دير الزور", "الرقة", "إدلب",
  "درعا", "السويداء", "الحسكة", "القنيطرة",
];

type EditForm = {
  title: string;
  short_description: string;
  description: string;
  category: string;
  city: string;
  district: string;
  project_goal: string;
  target_customers: string;
  business_model: string;
  total_budget: string;
  own_capital: string;
  currency: string;
  expected_monthly_revenue: string;
  expected_monthly_profit: string;
  expected_duration_months: string;
};

function toEditForm(p: Project): EditForm {
  return {
    title: p.title ?? "",
    short_description: p.short_description ?? "",
    description: p.description ?? "",
    category: p.category ?? "FOOD",
    city: p.city ?? "",
    district: p.district ?? "",
    project_goal: p.project_goal ?? "",
    target_customers: p.target_customers ?? "",
    business_model: p.business_model ?? "",
    total_budget: String(p.total_budget ?? ""),
    own_capital: String(p.own_capital ?? "0"),
    currency: p.currency ?? "EUR",
    expected_monthly_revenue: p.expected_monthly_revenue != null ? String(p.expected_monthly_revenue) : "",
    expected_monthly_profit: p.expected_monthly_profit != null ? String(p.expected_monthly_profit) : "",
    expected_duration_months: p.expected_duration_months != null ? String(p.expected_duration_months) : "",
  };
}

export function ProjectDetailView() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations("project");
  const tCat = useTranslations("project.categoryFull");
  const locale = useLocale();
  const governorates = locale === "ar" ? SYRIAN_GOV_AR : SYRIAN_GOV_EN;
  const id = Number(params.id);

  const [project, setProject]         = useState<Project | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [budgetItems, setBudgetItems] = useState<ProjectBudgetItem[]>([]);
  const [milestones, setMilestones]   = useState<ProjectMilestone[]>([]);
  const [updates, setUpdates]         = useState<ProjectUpdate[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);

  // join state
  const [joining, setJoining]           = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [joinAmount, setJoinAmount]     = useState("");
  const [joinAmountError, setJoinAmountError] = useState("");
  const [joinStatus, setJoinStatus]     = useState<"idle" | "pending" | "accepted" | "rejected">("idle");

  // edit state
  const [showEdit, setShowEdit]         = useState(false);
  const [editForm, setEditForm]         = useState<EditForm | null>(null);
  const [editSaving, setEditSaving]     = useState(false);
  const [editSuccess, setEditSuccess]   = useState(false);
  const [editError, setEditError]       = useState("");

  useEffect(() => {
    Promise.all([
      api.projects.get(id),
      api.projects.budgetItems.list(id),
      api.projects.milestones.list(id),
      api.projects.updates.list(id),
      api.users.me(),
    ])
      .then(([p, bi, ms, upd, me]) => {
        const proj = p as Project;
        setProject(proj);
        setBudgetItems(bi as ProjectBudgetItem[]);
        setMilestones(ms as ProjectMilestone[]);
        setUpdates(upd as ProjectUpdate[]);
        const user = me as User;
        setCurrentUser(user);
        const isOwner = proj.created_by_user_id === user.id || user.global_role === "ADMIN";
        if (isOwner) {
          api.projects.participants(id)
            .then(data => setParticipants(data as Participant[]))
            .catch(() => {});
        }
      })
      .catch(() => router.push("/login"));
  }, [id, router]);

  async function handleJoin() {
    const amount = parseFloat(joinAmount);
    if (isNaN(amount) || amount < 100) {
      setJoinAmountError(t("joinAmountMin"));
      return;
    }
    setJoining(true);
    setJoinAmountError("");
    try {
      await api.projects.join(id, amount);
      setJoinStatus("pending");
      setShowJoinForm(false);
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string };
      if (e?.status === 409 || String(err).includes("409") || e?.message?.includes("409")) {
        setJoinStatus("pending");
        setShowJoinForm(false);
      }
    } finally {
      setJoining(false);
    }
  }

  function openEdit() {
    if (!project) return;
    setEditForm(toEditForm(project));
    setEditSuccess(false);
    setEditError("");
    setShowEdit(true);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editForm || !project) return;
    setEditSaving(true);
    setEditError("");

    const EDITABLE_FIELDS: (keyof EditForm)[] = [
      "title", "short_description", "description", "category",
      "city", "district", "project_goal", "target_customers", "business_model",
      "total_budget", "own_capital", "currency",
      "expected_monthly_revenue", "expected_monthly_profit", "expected_duration_months",
    ];

    const original = toEditForm(project);
    const changes = EDITABLE_FIELDS
      .filter((k) => editForm[k] !== original[k])
      .map((k) => ({ field: k, value: editForm[k] || null }));

    if (changes.length === 0) {
      setShowEdit(false);
      setEditSaving(false);
      return;
    }

    try {
      await api.projects.changeRequest(id, { changes });
      setEditSuccess(true);
      setShowEdit(false);
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : t("editError"));
    } finally {
      setEditSaving(false);
    }
  }

  if (!project) return <PageSpinner />;

  const fundingPct = Math.min(project.funding_progress, 100);
  const isOwner = currentUser != null && (project.created_by_user_id === currentUser.id || currentUser.global_role === "ADMIN");

  return (
    <div className="min-h-screen bg-[var(--clr-bg)]">
      <div className="mx-auto max-w-screen-xl px-5 py-8 sm:px-8">

        <PageHeader title={project.title} backHref="/dashboard" backLabel={t("detail.backLabel")} />

        {editSuccess && (
          <Alert type="info" className="mb-4">{t("ownerChangeInfo")}</Alert>
        )}

        <div className="flex gap-6">

          {/* Teilnehmer-Sidebar — nur für Owner/Admin */}
          {isOwner && (
            <aside className="hidden lg:block" style={{ width: "240px", flexShrink: 0 }}>
              <div className="sticky top-4 rounded-card border border-line bg-surface px-4 py-4" style={{ boxShadow: "var(--sh-sm)", width: "380px", marginLeft: "-140px" }}>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-[var(--clr-text)]">{t("detail.participants")}</h2>
                  {participants.length > 0 && (
                    <span className="rounded-pill bg-brand px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">{participants.length}</span>
                  )}
                </div>
                {participants.length === 0 ? (
                  <p className="px-2 text-xs text-[var(--clr-text-3)]">{t("detail.noParticipants")}</p>
                ) : (
                  <ul className="space-y-1">
                    {participants.map((p) => (
                      <li key={p.interest_id} className={`rounded-lg px-2 py-2 text-sm ${
                        p.status === "ACCEPTED"
                          ? "bg-brand/10 dark:bg-brand/20"
                          : "hover:bg-surface-2"
                      }`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className={`truncate text-sm font-medium ${p.status === "ACCEPTED" ? "text-brand" : "text-[var(--clr-text)]"}`}>
                              {p.full_name || p.email}
                            </p>
                            <p className="truncate text-xs text-[var(--clr-text-3)]">
                              {[p.country, p.joined_at ? new Date(p.joined_at).toLocaleDateString(locale === "ar" ? "ar-SY" : locale === "de" ? "de-DE" : "en-GB") : null].filter(Boolean).join(" · ")}
                            </p>
                            <p className={`text-xs font-semibold ${p.status === "ACCEPTED" ? "text-brand" : "text-[var(--clr-text-2)]"}`}>
                              {p.amount ? formatMoney(p.amount, project.currency) : "—"}
                            </p>
                          </div>
                        </div>
                        <div className="mt-1.5">
                          <button
                            onClick={async () => {
                              await api.projects.removeParticipant(id, p.interest_id);
                              setParticipants(prev => prev.filter(x => x.interest_id !== p.interest_id));
                            }}
                            className="text-xs text-red-500 hover:underline"
                          >
                            {t("detail.removeParticipant")}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </aside>
          )}

          {/* Main Content */}
          <div className="min-w-0 flex-1">

        {/* Header Card */}
        <Card className="mb-6 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex-1">
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

              {/* Action area */}
              {project.status === "ACTIVE" && !isOwner && (
                <div className="mt-4">
                  {joinStatus === "pending" ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-sm font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                      {"⏳"} {t("joinPending")}
                    </span>
                  ) : joinStatus === "accepted" ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1.5 text-sm font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300">
                      {"✓"} {t("joinApproved")}
                    </span>
                  ) : showJoinForm ? (
                    <div className="flex flex-col gap-2 rounded-xl border border-[var(--clr-line)] bg-[var(--clr-surface-2)] p-4">
                      <label className="text-sm font-medium text-[var(--clr-text)]">
                        {t("joinAmount")}
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="100"
                          value={joinAmount}
                          onChange={e => { setJoinAmount(e.target.value); setJoinAmountError(""); }}
                          placeholder={t("joinAmountPlaceholder")}
                          className="flex-1 rounded-lg border border-[var(--clr-line)] bg-[var(--clr-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--clr-brand)]"
                        />
                        <button
                          onClick={handleJoin}
                          disabled={joining}
                          className="rounded-lg bg-[var(--clr-brand)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                        >
                          {joining ? t("joining") : t("join")}
                        </button>
                        <button
                          onClick={() => setShowJoinForm(false)}
                          className="rounded-lg border border-[var(--clr-line)] px-3 py-2 text-sm text-[var(--clr-text-2)] hover:bg-[var(--clr-surface-2)]"
                        >
                          {"✕"}
                        </button>
                      </div>
                      {joinAmountError && (
                        <p className="text-xs text-red-500">{joinAmountError}</p>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowJoinForm(true)}
                      className="rounded-lg bg-[var(--clr-brand)] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                    >
                      {t("join")}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Bearbeiten-Button für Ersteller */}
            {isOwner && (
              <button
                onClick={openEdit}
                className="shrink-0 rounded-lg border border-[var(--clr-brand)] px-4 py-2 text-sm font-semibold text-[var(--clr-brand)] transition hover:bg-[var(--clr-brand)] hover:text-white"
              >
                {t("editProject")}
              </button>
            )}
          </div>
        </Card>

        {/* Edit-Modal */}
        {showEdit && editForm && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-16">
            <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-[var(--clr-surface)]">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="font-display text-lg font-bold text-[var(--clr-text)]">{t("editProject")}</h2>
                <button onClick={() => setShowEdit(false)} className="text-[var(--clr-text-3)] hover:text-[var(--clr-text)]">{"✕"}</button>
              </div>

              {editError && <Alert type="error" className="mb-4">{editError}</Alert>}

              <p className="mb-5 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                {t("editPendingInfo")}
              </p>

              <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
                <InputField label={t("createForm.title")} type="text" value={editForm.title}
                  onChange={e => setEditForm({ ...editForm, title: e.target.value })} required className="!bg-white dark:!bg-[var(--clr-surface-2)]" />
                <InputField label={t("createForm.shortDescription")} type="text" value={editForm.short_description}
                  onChange={e => setEditForm({ ...editForm, short_description: e.target.value })} maxLength={300} className="!bg-white dark:!bg-[var(--clr-surface-2)]" />
                <TextareaField label={t("createForm.description")} value={editForm.description}
                  onChange={e => setEditForm({ ...editForm, description: e.target.value })} rows={3} required className="!bg-white dark:!bg-[var(--clr-surface-2)]" />
                <SelectField label={t("createForm.category")} value={editForm.category}
                  onChange={e => setEditForm({ ...editForm, category: e.target.value })} className="!bg-white dark:!bg-[var(--clr-surface-2)]">
                  {ALL_CATEGORIES.map(c => <option key={c} value={c}>{tCat(c as Parameters<typeof tCat>[0])}</option>)}
                </SelectField>

                <div className="grid grid-cols-2 gap-4">
                  <SelectField label={locale === "ar" ? "المحافظة *" : "Bundesland *"} value={editForm.city}
                    onChange={e => setEditForm({ ...editForm, city: e.target.value })} required className="!bg-white dark:!bg-[var(--clr-surface-2)]">
                    <option value="">{locale === "ar" ? "اختر المحافظة" : "Bitte wählen"}</option>
                    {governorates.map(g => <option key={g} value={g}>{g}</option>)}
                  </SelectField>
                  <InputField label={locale === "ar" ? "المدينة" : "Stadt"} type="text" value={editForm.district}
                    onChange={e => setEditForm({ ...editForm, district: e.target.value })} ltr className="!bg-white dark:!bg-[var(--clr-surface-2)]" />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <InputField label={t("createForm.totalBudget")} type="number" value={editForm.total_budget}
                    onChange={e => setEditForm({ ...editForm, total_budget: e.target.value })} min="1" required className="!bg-white dark:!bg-[var(--clr-surface-2)]" />
                  <InputField label={t("createForm.ownCapital")} type="number" value={editForm.own_capital}
                    onChange={e => setEditForm({ ...editForm, own_capital: e.target.value })} min="0" className="!bg-white dark:!bg-[var(--clr-surface-2)]" />
                  <SelectField label={t("createForm.currency")} value={editForm.currency}
                    onChange={e => setEditForm({ ...editForm, currency: e.target.value })} className="!bg-white dark:!bg-[var(--clr-surface-2)]">
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                    <option value="SYP">SYP</option>
                  </SelectField>
                </div>

                <TextareaField label={t("createForm.projectGoal")} value={editForm.project_goal}
                  onChange={e => setEditForm({ ...editForm, project_goal: e.target.value })} rows={2} className="!bg-white dark:!bg-[var(--clr-surface-2)]" />
                <TextareaField label={t("createForm.targetCustomers")} value={editForm.target_customers}
                  onChange={e => setEditForm({ ...editForm, target_customers: e.target.value })} rows={2} className="!bg-white dark:!bg-[var(--clr-surface-2)]" />
                <TextareaField label={t("createForm.businessModel")} value={editForm.business_model}
                  onChange={e => setEditForm({ ...editForm, business_model: e.target.value })} rows={2} className="!bg-white dark:!bg-[var(--clr-surface-2)]" />

                <div className="grid grid-cols-3 gap-4">
                  <InputField label={t("createForm.monthlyRevenue")} type="number" value={editForm.expected_monthly_revenue}
                    onChange={e => setEditForm({ ...editForm, expected_monthly_revenue: e.target.value })} min="0" className="!bg-white dark:!bg-[var(--clr-surface-2)]" />
                  <InputField label={t("createForm.monthlyProfit")} type="number" value={editForm.expected_monthly_profit}
                    onChange={e => setEditForm({ ...editForm, expected_monthly_profit: e.target.value })} className="!bg-white dark:!bg-[var(--clr-surface-2)]" />
                  <InputField label={t("createForm.duration")} type="number" value={editForm.expected_duration_months}
                    onChange={e => setEditForm({ ...editForm, expected_duration_months: e.target.value })} min="1" className="!bg-white dark:!bg-[var(--clr-surface-2)]" />
                </div>

                <div className="mt-2 flex justify-end gap-3">
                  <button type="button" onClick={() => setShowEdit(false)}
                    className="rounded-lg border border-[var(--clr-line)] px-4 py-2 text-sm text-[var(--clr-text-2)] hover:bg-[var(--clr-surface-2)]">
                    {locale === "ar" ? "إلغاء" : "Abbrechen"}
                  </button>
                  <button type="submit" disabled={editSaving}
                    className="rounded-lg bg-[var(--clr-brand)] px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50">
                    {editSaving ? (locale === "ar" ? "جارٍ الإرسال..." : "Wird gesendet...") : t("editSendRequest")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

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

        {/* Projektdetails */}
        {(project.start_date || project.address_text || project.created_at || project.video_url) && (
          <Card className="mt-6 p-6">
            <h2 className="mb-4 font-display text-base font-semibold text-[var(--clr-text)]">{t("detail.projectDetails")}</h2>
            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              {project.created_at && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-[var(--clr-text-3)]">{t("detail.createdAt")}</span>
                  <span className="text-[var(--clr-text-2)]">{new Date(project.created_at).toLocaleDateString(locale === "ar" ? "ar-SY" : locale === "de" ? "de-DE" : "en-GB")}</span>
                </div>
              )}
              {project.start_date && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-[var(--clr-text-3)]">{t("detail.startDate")}</span>
                  <span className="text-[var(--clr-text-2)]">{new Date(project.start_date).toLocaleDateString(locale === "ar" ? "ar-SY" : locale === "de" ? "de-DE" : "en-GB")}</span>
                </div>
              )}
              {project.address_text && (
                <div className="flex flex-col gap-0.5 sm:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-[var(--clr-text-3)]">{t("detail.address")}</span>
                  <span className="text-[var(--clr-text-2)]">{project.address_text}</span>
                </div>
              )}
              {project.video_url && (
                <div className="flex flex-col gap-0.5 sm:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-[var(--clr-text-3)]">{t("detail.video")}</span>
                  <a href={project.video_url} target="_blank" rel="noopener noreferrer" className="truncate text-brand hover:underline">{project.video_url}</a>
                </div>
              )}
            </div>
          </Card>
        )}

          </div> {/* end main content */}
        </div> {/* end flex gap-6 */}

      </div>
    </div>
  );
}
