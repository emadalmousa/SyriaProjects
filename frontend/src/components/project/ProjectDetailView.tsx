"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { api } from "@/lib/api";
import { formatMoney, formatPercent } from "@/lib/format";
import type { Project, ProjectMilestone, ProjectPhaseItem, ProjectUpdate, User, Participant } from "@/types";
import { PageSpinner, Card, Alert, Tooltip } from "@/components/ui";
import { PageHeader } from "@/components/layout";
import { StatusBadge, CategoryBadge, FundingBar, ALL_CATEGORIES } from "@/components/project";
import { InputField, SelectField, TextareaField } from "@/components/ui";
import { ConfirmDialog } from "@/components/management";

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
  const tt = useTranslations("common.tooltip");
  const locale = useLocale();
  const governorates = locale === "ar" ? SYRIAN_GOV_AR : SYRIAN_GOV_EN;
  const id = Number(params.id);

  const [project, setProject]         = useState<Project | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [phases, setPhases]           = useState<ProjectMilestone[]>([]);
  const [phaseItems, setPhaseItems]   = useState<ProjectPhaseItem[]>([]);
  const [updates, setUpdates]         = useState<ProjectUpdate[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);

  // join state
  const [joining, setJoining]             = useState(false);
  const [showJoinForm, setShowJoinForm]   = useState(false);
  const [joinAmount, setJoinAmount]       = useState("");
  const [joinAmountError, setJoinAmountError] = useState("");
  const [joinStatus, setJoinStatus]       = useState<"idle" | "pending" | "accepted" | "rejected">("idle");
  const [showChangeForm, setShowChangeForm] = useState(false);
  const [changeAmount, setChangeAmount]   = useState("");
  const [changeAmountError, setChangeAmountError] = useState("");
  const [changing, setChanging]           = useState(false);

  // remove participant state
  const [confirmRemove, setConfirmRemove] = useState<Participant | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  // edit state
  const [showEdit, setShowEdit]         = useState(false);
  const [editForm, setEditForm]         = useState<EditForm | null>(null);
  const [editSaving, setEditSaving]     = useState(false);
  const [editSuccess, setEditSuccess]   = useState(false);
  const [editError, setEditError]       = useState("");

  // Fix 13: Include participants in main Promise.all
  useEffect(() => {
    Promise.all([
      api.projects.get(id),
      api.projects.milestones.list(id),
      api.projects.phaseItems.list(id),
      api.projects.updates.list(id),
      api.users.me(),
      api.projects.participants(id),
    ])
      .then(([p, ms, pi, upd, me, parts]) => {
        const proj = p as Project;
        setProject(proj);
        setPhases(ms as ProjectMilestone[]);
        setPhaseItems(pi as ProjectPhaseItem[]);
        setUpdates(upd as ProjectUpdate[]);
        const user = me as User;
        setCurrentUser(user);
        const list = parts as Participant[];
        setParticipants(list);
        // Fix 3: also handle WITHDRAWN → show as rejected (no join button)
        const mine = list.find(part => part.user_id === user.id);
        if (mine) {
          if (mine.status === "ACCEPTED")       { setJoinStatus("accepted"); setChangeAmount(mine.amount ? String(mine.amount) : ""); }
          else if (mine.status === "PENDING")   setJoinStatus("pending");
          else if (mine.status === "REJECTED")  setJoinStatus("rejected");
          else if (mine.status === "WITHDRAWN") setJoinStatus("rejected");
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

  async function handleChangeContribution() {
    const amount = parseFloat(changeAmount);
    if (isNaN(amount) || amount < 100) {
      setChangeAmountError(t("joinAmountMin"));
      return;
    }
    setChanging(true);
    setChangeAmountError("");
    try {
      await api.projects.changeParticipation(id, { amount });
      setShowChangeForm(false);
    } catch {
      setChangeAmountError(t("editError"));
    } finally {
      setChanging(false);
    }
  }

  // Fix 9 + Fix 11: remove participant with confirmation and error handling
  async function handleRemoveParticipant(participant: Participant) {
    try {
      await api.projects.removeParticipant(id, participant.interest_id);
      setParticipants(prev => prev.filter(x => x.interest_id !== participant.interest_id));
      setRemoveError(null);
    } catch (err) {
      console.error("Failed to remove participant", err);
      setRemoveError(t("editError"));
    } finally {
      setConfirmRemove(null);
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

        {/* Fix 11: Confirm dialog for removing participant */}
        {confirmRemove && (
          <ConfirmDialog
            title={t("detail.removeParticipant")}
            message={confirmRemove.full_name || confirmRemove.email || ""}
            confirmLabel={t("detail.removeParticipant")}
            cancelLabel={locale === "ar" ? "إلغاء" : "Abbrechen"}
            onConfirm={() => handleRemoveParticipant(confirmRemove)}
            onCancel={() => setConfirmRemove(null)}
          />
        )}

        {/* Fix 10: Responsive layout — main content first in DOM (shows first on mobile),
            sidebar uses lg:order-first to appear left on desktop */}
        <div className="flex flex-col gap-6 lg:flex-row">

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
                  ) : joinStatus === "rejected" ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1.5 text-sm font-medium text-red-800 dark:bg-red-900/30 dark:text-red-300">
                      {"✕"} {t("joinRejected")}
                    </span>
                  ) : joinStatus === "accepted" ? (
                    <div className="flex flex-col gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1.5 text-sm font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300">
                        {"✓"} {t("joinApproved")}
                      </span>
                      {showChangeForm ? (
                        <div className="flex flex-col gap-2 rounded-xl border border-[var(--clr-line)] bg-[var(--clr-surface-2)] p-4">
                          <label className="text-sm font-medium text-[var(--clr-text)]">{t("changeContributionAmount")}</label>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              min="100"
                              value={changeAmount}
                              onChange={e => { setChangeAmount(e.target.value); setChangeAmountError(""); }}
                              placeholder={t("joinAmountPlaceholder")}
                              className="flex-1 rounded-lg border border-[var(--clr-line)] bg-[var(--clr-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--clr-brand)]"
                            />
                            <button
                              onClick={handleChangeContribution}
                              disabled={changing}
                              className="rounded-lg bg-[var(--clr-brand)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                            >
                              {changing ? t("changing") : t("changeContribution")}
                            </button>
                            <Tooltip text={tt("cancelJoin")} side="top">
                              <button
                                onClick={() => setShowChangeForm(false)}
                                className="rounded-lg border border-[var(--clr-line)] px-3 py-2 text-sm text-[var(--clr-text-2)] hover:bg-[var(--clr-surface-2)]"
                              >
                                {"✕"}
                              </button>
                            </Tooltip>
                          </div>
                          {changeAmountError && <p className="text-xs text-red-500">{changeAmountError}</p>}
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowChangeForm(true)}
                          className="w-fit rounded-lg border border-[var(--clr-brand)] px-4 py-2 text-sm font-semibold text-[var(--clr-brand)] transition hover:bg-[var(--clr-brand)] hover:text-white"
                        >
                          {t("changeContribution")}
                        </button>
                      )}
                    </div>
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
                        <Tooltip text={tt("cancelJoin")} side="top">
                          <button
                            onClick={() => setShowJoinForm(false)}
                            className="rounded-lg border border-[var(--clr-line)] px-3 py-2 text-sm text-[var(--clr-text-2)] hover:bg-[var(--clr-surface-2)]"
                          >
                            {"✕"}
                          </button>
                        </Tooltip>
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
              <Tooltip text={tt("editProject")} side="bottom">
                <button
                  onClick={openEdit}
                  className="shrink-0 rounded-lg border border-[var(--clr-brand)] px-4 py-2 text-sm font-semibold text-[var(--clr-brand)] transition hover:bg-[var(--clr-brand)] hover:text-white"
                >
                  {t("editProject")}
                </button>
              </Tooltip>
            )}
          </div>
        </Card>

        {/* Edit-Modal */}
        {showEdit && editForm && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-16">
            <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-[var(--clr-surface)]">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="font-display text-lg font-bold text-[var(--clr-text)]">{t("editProject")}</h2>
                <Tooltip text={tt("closeModal")} side="left">
                  <button onClick={() => setShowEdit(false)} className="text-[var(--clr-text-3)] hover:text-[var(--clr-text)]">{"✕"}</button>
                </Tooltip>
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

        {/* Phasen */}
        {phases.length > 0 && (
          <Card className="mt-6 p-6">
            <h2 className="mb-4 font-display text-base font-semibold text-[var(--clr-text)]">{t("detail.phases")}</h2>
            <div className="flex flex-col gap-4">
              {phases.map((phase, i) => {
                const items = phaseItems.filter((pi) => pi.milestone_id === phase.id);
                const phaseTotal = items.reduce((s, it) => s + Number(it.amount), 0);
                return (
                  <div key={phase.id} className="rounded-lg border border-line p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-bold text-brand">
                        {i + 1}
                      </span>
                      <p className="font-semibold text-[var(--clr-text)]">{phase.title}</p>
                    </div>
                    {items.length > 0 && (
                      <div className="flex flex-col gap-1.5">
                        {items.map((it) => (
                          <div key={it.id} className="flex justify-between rounded bg-surface-2 px-3 py-2 text-sm">
                            <span className="text-[var(--clr-text-2)]">{it.title}</span>
                            {/* Fix 1: use project.currency instead of hardcoded "EUR" */}
                            <span className="font-medium text-brand">{formatMoney(it.amount, project.currency)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between border-t border-line pt-1.5 text-sm">
                          <span className="font-medium text-[var(--clr-text)]">{t("detail.phaseTotal")}</span>
                          {/* Fix 1: use project.currency instead of hardcoded "EUR" */}
                          <span className="font-bold text-[var(--clr-text)]">{formatMoney(phaseTotal, project.currency)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
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

          {/* Fix 10: Sidebar — uses lg:order-first so it appears left on desktop, but below main on mobile */}
          <aside className="w-full lg:w-[312px] lg:shrink-0 lg:order-first">
            <div className="sticky top-4 flex flex-col gap-4 w-full">

              {/* Fix 9: Remove error display */}
              {removeError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-600 dark:border-red-800/30 dark:bg-red-900/20 dark:text-red-400">
                  {removeError}
                </div>
              )}

              {/* Projektersteller */}
              <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--clr-brand)] to-[var(--clr-brand-mid,#1a7a5e)] text-white" style={{ boxShadow: "0 4px 16px 0 rgb(0 0 0 / 0.15)" }}>
                <div className="px-4 pt-4 pb-3">
                  <p className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-white/60">{t("detail.projectCreator")}</p>
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/20 text-[10px] font-bold text-white ring-2 ring-white/30">
                      {(project.creator_name || "?").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-white">{project.creator_name || "—"}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mitglieder (accepted) */}
              {(() => {
                const accepted = participants.filter(p => p.status === "ACCEPTED");
                if (accepted.length === 0) return null;
                return (
                  <div className="overflow-hidden rounded-2xl border border-emerald-200/70 bg-gradient-to-b from-emerald-50 to-white dark:border-emerald-800/30 dark:from-emerald-900/20 dark:to-[var(--clr-surface)]" style={{ boxShadow: "0 2px 12px 0 rgb(16 185 129 / 0.10)" }}>
                    <div className="flex items-center justify-between border-b border-emerald-100/80 px-4 py-3 dark:border-emerald-800/20">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">{accepted.length}</span>
                        <span className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">{t("detail.statusAccepted")}</span>
                      </div>
                    </div>
                    <ul className="flex flex-col divide-y divide-emerald-100/60 dark:divide-emerald-800/20">
                      {accepted.map((p) => {
                        const initials = (p.full_name || p.email || "?").slice(0, 2).toUpperCase();
                        return (
                          <li key={p.interest_id} className="flex items-center gap-3 px-4 py-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-sm font-bold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                              {initials}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-semibold text-[var(--clr-text)]">{p.full_name || p.email || "—"}</p>
                              {p.country && <p className="truncate text-[10px] text-[var(--clr-text-3)]">{p.country}</p>}
                              {p.amount && (
                                <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">{formatMoney(p.amount, project.currency)}</p>
                              )}
                            </div>
                            {/* Fix 11+12: confirmation dialog + aria-label */}
                            {isOwner && (
                              <Tooltip text={tt("removeParticipant")} side="left">
                                <button
                                  onClick={() => setConfirmRemove(p)}
                                  aria-label={t("detail.removeParticipant")}
                                  className="shrink-0 rounded-full p-1 text-[var(--clr-text-3)] transition hover:bg-red-100 hover:text-red-500 dark:hover:bg-red-900/30"
                                >
                                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                              </Tooltip>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })()}

              {/* Andere Teilnehmer (pending / rest) */}
              {(() => {
                const pending = participants.filter(p => p.status !== "ACCEPTED");
                if (pending.length === 0 && participants.length === 0) {
                  return (
                    <div className="rounded-2xl border border-[var(--clr-line)] bg-[var(--clr-surface)] px-4 py-5 text-center" style={{ boxShadow: "var(--sh-sm)" }}>
                      <p className="text-xs text-[var(--clr-text-3)]">{t("detail.noParticipants")}</p>
                    </div>
                  );
                }
                if (pending.length === 0) return null;
                return (
                  <div className="overflow-hidden rounded-2xl border border-[var(--clr-line)] bg-[var(--clr-surface)]" style={{ boxShadow: "var(--sh-sm)" }}>
                    <div className="flex items-center justify-between border-b border-[var(--clr-line)] px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-400/20 text-[10px] font-bold text-amber-600 dark:text-amber-400">{pending.length}</span>
                        <span className="text-xs font-bold uppercase tracking-wide text-[var(--clr-text-2)]">{t("detail.statusPending")}</span>
                      </div>
                    </div>
                    <ul className="flex flex-col divide-y divide-[var(--clr-line)]">
                      {pending.map((p) => {
                        const initials = (p.full_name || p.email || "?").slice(0, 2).toUpperCase();
                        return (
                          <li key={p.interest_id} className="flex items-center gap-3 px-4 py-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--clr-surface-2)] text-xs font-bold text-[var(--clr-text-2)]">
                              {initials}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs text-[var(--clr-text)]">{p.full_name || p.email || "—"}</p>
                              {p.country && <p className="truncate text-[10px] text-[var(--clr-text-3)]">{p.country}</p>}
                              {p.amount && <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400">{formatMoney(p.amount, project.currency)}</p>}
                            </div>
                            {/* Fix 11+12: confirmation dialog + aria-label */}
                            {isOwner && (
                              <Tooltip text={tt("removeParticipant")} side="left">
                                <button
                                  onClick={() => setConfirmRemove(p)}
                                  aria-label={t("detail.removeParticipant")}
                                  className="shrink-0 rounded-full p-1 text-[var(--clr-text-3)] transition hover:bg-red-100 hover:text-red-500 dark:hover:bg-red-900/30"
                                >
                                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                              </Tooltip>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })()}

            </div>
          </aside>

        </div> {/* end flex gap-6 */}

      </div>
    </div>
  );
}
