"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import type { User, Project, UserInterest, AdminRequest } from "@/types";
import { Alert, Button, Avatar, PageSpinner, Tooltip } from "@/components/ui";
import { InputField, SelectField } from "@/components/ui";
import { Card } from "@/components/ui";
import { StatusBadge } from "@/components/project";

const COUNTRIES = [
  "Syrien","Deutschland","Österreich","Schweiz","Türkei","Vereinigte Arabische Emirate",
  "Saudi-Arabien","Jordanien","Libanon","Ägypten","USA","Kanada","Großbritannien",
  "Frankreich","Niederlande","Schweden","Norwegen","Dänemark","Andere",
];

export function ProfileForm() {
  const router = useRouter();
  const t = useTranslations("profile");
  const tProject = useTranslations("project");
  const tt = useTranslations("common.tooltip");

  const [user, setUser]       = useState<User | null>(null);
  const [form, setForm]       = useState({ first_name: "", last_name: "", phone: "", country: "" });
  const [savedForm, setSavedForm] = useState({ first_name: "", last_name: "", phone: "", country: "" });
  const [editing, setEditing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent]       = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const [projects, setProjects]         = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [participations, setParticipations] = useState<UserInterest[]>([]);
  const [requests, setRequests] = useState<AdminRequest[]>([]);

  // Participation action states
  const [withdrawingId, setWithdrawingId] = useState<number | null>(null);
  const [withdrawResult, setWithdrawResult] = useState<Record<number, string>>({});
  const [changingId, setChangingId] = useState<number | null>(null);
  const [changeAmount, setChangeAmount] = useState("");
  const [activeTab, setActiveTab] = useState<"projects" | "participations">("projects");
  const [mainTab, setMainTab] = useState<"profile" | "projects">("profile");

  // Balance request state
  const [showBalanceForm, setShowBalanceForm] = useState(false);
  const [balanceAmount, setBalanceAmount] = useState("");
  const [balanceCurrency, setBalanceCurrency] = useState("EUR");
  const [balanceNote, setBalanceNote] = useState("");
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceResult, setBalanceResult] = useState<"sent" | "error" | null>(null);
  const pendingBalanceCurrencies = new Set(
    requests
      .filter(r => r.type === "CHANGE_BALANCE" && r.status === "PENDING")
      .map(r => { try { return JSON.parse(r.payload || "{}").currency; } catch { return null; } })
      .filter(Boolean)
  );

  useEffect(() => {
    api.users.me()
      .then((u) => {
        const me = u as User;
        setUser(me);
        const initial = { first_name: me.first_name || "", last_name: me.last_name || "", phone: me.phone || "", country: me.country || "" };
        setForm(initial);
        setSavedForm(initial);
      })
      .catch(() => router.push("/login"));

    api.projects.my()
      .then((p) => setProjects(p as Project[]))
      .catch(() => {})
      .finally(() => setProjectsLoading(false));

    api.users.myInterests()
      .then((data) => setParticipations(data as UserInterest[]))
      .catch(() => {});

    api.users.myRequests()
      .then((data) => setRequests(data as AdminRequest[]))
      .catch(() => {});
  }, [router]);

  function set(field: string, value: string) { setForm((f) => ({ ...f, [field]: value })); }

  async function handleResetPassword() {
    if (!user) return;
    setResetLoading(true);
    try { await api.auth.forgotPassword(user.email); setResetSent(true); }
    finally { setResetLoading(false); }
  }

  function handleEdit() {
    setEditing(true);
    setSuccess(false);
    setError("");
  }

  function handleCancel() {
    setForm(savedForm);
    setEditing(false);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setSuccess(false);
    if (!form.first_name.trim()) { setError(t("firstName") + " required"); return; }
    setLoading(true);
    try {
      const updated = await api.users.updateProfile(form) as User;
      const saved = { first_name: updated.first_name || "", last_name: updated.last_name || "", phone: updated.phone || "", country: updated.country || "" };
      setSavedForm(saved);
      setForm(saved);
      setSuccess(true);
      setEditing(false);
      // Merge only profile fields into existing user state (balance fields stay intact)
      setUser(prev => prev ? { ...prev, ...saved } : prev);
    }
    catch (err: unknown) { setError(err instanceof Error ? err.message : "Error"); }
    finally { setLoading(false); }
  }

  async function handleWithdraw(projectId: number) {
    setWithdrawingId(projectId);
    try {
      const res = await api.projects.withdrawParticipation(projectId) as { requires_approval?: boolean };
      if (res.requires_approval) {
        setWithdrawResult(prev => ({ ...prev, [projectId]: "pending" }));
        // Refresh requests list
        api.users.myRequests().then((data) => setRequests(data as AdminRequest[])).catch(() => {});
      } else {
        setParticipations(prev => prev.filter(p => p.project_id !== projectId));
      }
    } catch {
      // ignore
    } finally {
      setWithdrawingId(null);
    }
  }

  async function handleBalanceRequest() {
    const amount = parseFloat(balanceAmount);
    if (isNaN(amount) || amount <= 0) return;
    setBalanceLoading(true);
    setBalanceResult(null);
    try {
      await api.users.requestBalanceChange(amount, balanceCurrency, balanceNote || undefined);
      setBalanceResult("sent");
      setShowBalanceForm(false);
      setBalanceAmount("");
      setBalanceCurrency("EUR");
      setBalanceNote("");
      api.users.myRequests().then((data) => setRequests(data as AdminRequest[])).catch(() => {});
    } catch {
      setBalanceResult("error");
    } finally {
      setBalanceLoading(false);
    }
  }

  async function handleChangeAmount(projectId: number) {
    const amount = parseFloat(changeAmount);
    if (isNaN(amount) || amount < 100) return;
    try {
      await api.projects.changeParticipation(projectId, { amount });
      setChangingId(null);
      setChangeAmount("");
      setWithdrawResult(prev => ({ ...prev, [projectId]: "change_sent" }));
      // Refresh requests list
      api.users.myRequests().then((data) => setRequests(data as AdminRequest[])).catch(() => {});
    } catch {
      // ignore
    }
  }

  if (!user) return <PageSpinner />;

  return (
    <div className="bg-[var(--clr-bg)] min-h-screen">
      <div className="mx-auto max-w-screen-lg px-5 py-8 sm:px-8">

        {/* Main tab bar */}
        <div className="mb-8 flex gap-1 rounded-xl border border-line bg-surface p-1" style={{ boxShadow: "var(--sh-sm)" }}>
          <button
            onClick={() => setMainTab("profile")}
            className={`flex flex-1 items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
              mainTab === "profile"
                ? "bg-brand text-white shadow-sm"
                : "text-[var(--clr-text-2)] hover:text-[var(--clr-text)]"
            }`}
          >
            {t("tabProfile")}
          </button>
          <button
            onClick={() => setMainTab("projects")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
              mainTab === "projects"
                ? "bg-brand text-white shadow-sm"
                : "text-[var(--clr-text-2)] hover:text-[var(--clr-text)]"
            }`}
          >
            {t("tabProjects")}
            {(projects.length + participations.length) > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${
                mainTab === "projects" ? "bg-white/20 text-white" : "bg-brand/10 text-brand"
              }`}>
                {projects.length + participations.length}
              </span>
            )}
          </button>
        </div>

        {/* ── Tab: Profil ── */}
        {mainTab === "profile" && (
          <Card className="mx-auto max-w-lg p-8" style={{ boxShadow: "var(--sh-md)" }}>

            {/* Avatar + info */}
            <div className="mb-6 flex items-center gap-4">
              <Avatar user={user} size="lg" />
              <div className="flex-1">
                <p className="font-semibold text-[var(--clr-text)]">
                  {[user.first_name, user.last_name].filter(Boolean).join(" ") || "—"}
                </p>
                <p className="text-sm text-[var(--clr-text-2)]">{user.email}</p>
                <span className="mt-1 inline-block rounded-lg border border-line bg-surface-2 px-2.5 py-0.5 text-xs font-semibold text-[var(--clr-text-2)]">
                  {user.global_role}
                </span>
              </div>
            </div>

            {/* Investment Guthaben – Currency Cards */}
            <div className="mb-8 rounded-2xl border border-line bg-surface-2 p-4">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--clr-text-2)]">
                {t("investmentBalance")}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { code: "EUR", symbol: "€", label: "Euro",          flag: "🇪🇺", accent: "#3b82f6" },
                  { code: "USD", symbol: "$", label: "US-Dollar",      flag: "🇺🇸", accent: "#10b981" },
                  { code: "SYP", symbol: "ل.س", label: "Syr. Pfund",  flag: "🇸🇾", accent: "#f59e0b" },
                ] as const).map(({ code, symbol, label, flag, accent }) => {
                  const bal = (user.investment_balances ?? []).find(b => b.currency === code);
                  const amount = bal?.amount ?? 0;
                  const pending = pendingBalanceCurrencies.has(code);
                  return (
                    <div
                      key={code}
                      className="relative flex flex-col overflow-hidden rounded-xl p-3"
                      style={{ borderLeft: `3px solid ${accent}`, background: `${accent}0d` }}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-base leading-none">{flag}</span>
                        {pending && (
                          <span
                            className="rounded-full px-1.5 py-0.5 text-[9px] font-bold leading-none"
                            style={{ background: "#f59e0b22", color: "#b45309" }}
                            title={t("balanceRequestPending")}
                          >⏳</span>
                        )}
                      </div>
                      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: accent }}>{code}</p>
                      <p className="truncate text-[10px] text-[var(--clr-text-2)]">{label}</p>
                      <p className="mt-1.5 text-base font-bold leading-tight text-[var(--clr-text)]">
                        {amount.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        <span className="ml-0.5 text-[10px] font-semibold" style={{ color: accent }}>{symbol}</span>
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {success && <Alert type="success" className="mb-5">{t("saveSuccess")}</Alert>}
            {error   && <Alert type="error"   className="mb-5">{error}</Alert>}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <InputField label={t("firstName")} type="text" value={form.first_name} onChange={(e) => set("first_name", e.target.value)} placeholder="Ahmad" required disabled={!editing} />
                <InputField label={t("lastName")} type="text" value={form.last_name} onChange={(e) => set("last_name", e.target.value)} placeholder="Al-Halabi" disabled={!editing} />
              </div>

              <InputField label={t("email")} type="email" value={user.email} disabled />

              <div className="grid grid-cols-2 gap-3">
                <InputField label={t("phone")} type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+49 123 456789" disabled={!editing} />
                <SelectField label={t("country")} value={form.country} onChange={(e) => set("country", e.target.value)} disabled={!editing}>
                  <option value="">{t("countryPlaceholder")}</option>
                  {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </SelectField>
              </div>

              {editing ? (
                <div className="mt-2 flex gap-3">
                  <Button type="submit" loading={loading} loadingLabel={t("saving")} className="flex-1" size="lg">
                    {t("save")}
                  </Button>
                  <Button type="button" variant="secondary" onClick={handleCancel} disabled={loading} className="flex-1" size="lg">
                    {t("cancel")}
                  </Button>
                </div>
              ) : (
                <Button type="button" variant="secondary" onClick={handleEdit} className="mt-2 w-full" size="lg">
                  {t("edit")}
                </Button>
              )}
            </form>

            <div className="mt-6 border-t border-line pt-6">
              {resetSent ? (
                <Alert type="success">{t("resetSent", { email: user.email })}</Alert>
              ) : (
                <Button variant="secondary" onClick={handleResetPassword} loading={resetLoading} loadingLabel={t("sendingReset")} className="w-full" size="lg">
                  {t("resetPassword")}
                </Button>
              )}
            </div>

            {/* Balance change request */}
            <div className="mt-6 border-t border-line pt-6">
              <div className="flex items-center justify-end">
                <Button variant="secondary" size="sm" onClick={() => { setShowBalanceForm(v => !v); setBalanceResult(null); }}>
                  {t("balanceRequestBtn")}
                </Button>
              </div>

              {balanceResult === "sent" && (
                <Alert type="success" className="mt-3">{t("balanceRequestSent")}</Alert>
              )}
              {balanceResult === "error" && (
                <Alert type="error" className="mt-3">{t("balanceRequestError")}</Alert>
              )}

              {showBalanceForm && (
                <div className="mt-4 flex flex-col gap-3 rounded-xl border border-line bg-surface-2 p-4">
                  <p className="text-sm font-semibold text-[var(--clr-text)]">{t("balanceRequestTitle")}</p>
                  <SelectField
                    label={t("balanceRequestCurrency")}
                    value={balanceCurrency}
                    onChange={(e) => setBalanceCurrency(e.target.value)}
                  >
                    <option value="EUR">EUR – Euro</option>
                    <option value="USD">USD – US-Dollar</option>
                    <option value="SYP">SYP – Syrisches Pfund</option>
                  </SelectField>
                  <InputField
                    label={`${t("balanceRequestAmount")} (${balanceCurrency})`}
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={balanceAmount}
                    onChange={(e) => setBalanceAmount(e.target.value)}
                    placeholder="0.00"
                  />
                  {pendingBalanceCurrencies.has(balanceCurrency) && (
                    <p className="text-xs text-amber-600">{t("balanceRequestPending")} ({balanceCurrency})</p>
                  )}
                  <InputField
                    label={t("balanceRequestNote")}
                    type="text"
                    value={balanceNote}
                    onChange={(e) => setBalanceNote(e.target.value)}
                    placeholder="..."
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      loading={balanceLoading}
                      loadingLabel="..."
                      onClick={handleBalanceRequest}
                      disabled={pendingBalanceCurrencies.has(balanceCurrency)}
                      className="flex-1"
                    >
                      {t("balanceRequestSubmit")}
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => { setShowBalanceForm(false); setBalanceResult(null); }} disabled={balanceLoading} className="flex-1">
                      {t("cancel")}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* ── Tab: Projekte ── */}
        {mainTab === "projects" && (
          <div className="flex flex-col gap-6">

            {/* Sub-tab bar */}
            <div className="flex gap-1 rounded-xl border border-line bg-surface p-1" style={{ boxShadow: "var(--sh-sm)" }}>
              <button
                onClick={() => setActiveTab("projects")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                  activeTab === "projects"
                    ? "bg-brand text-white shadow-sm"
                    : "text-[var(--clr-text-2)] hover:text-[var(--clr-text)]"
                }`}
              >
                {t("tabOwn")}
                {projects.length > 0 && (
                  <span className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${
                    activeTab === "projects" ? "bg-white/20 text-white" : "bg-brand/10 text-brand"
                  }`}>{projects.length}</span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("participations")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                  activeTab === "participations"
                    ? "bg-brand text-white shadow-sm"
                    : "text-[var(--clr-text-2)] hover:text-[var(--clr-text)]"
                }`}
              >
                {t("tabJoined")}
                {participations.length > 0 && (
                  <span className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${
                    activeTab === "participations" ? "bg-white/20 text-white" : "bg-brand/10 text-brand"
                  }`}>{participations.length}</span>
                )}
              </button>
            </div>

            {/* Sub-tab: Meine Projekte */}
            {activeTab === "projects" && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-end">
                  <Link href="/projects/create">
                    <Button size="sm">{t("newProject")}</Button>
                  </Link>
                </div>
                {projectsLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-brand border-t-transparent" />
                  </div>
                ) : projects.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-line bg-surface py-20" style={{ boxShadow: "var(--sh-sm)" }}>
                    <span className="mb-3 text-4xl">{"\u{1F4CB}"}</span>
                    <p className="font-medium text-[var(--clr-text-2)]">{t("noProjects")}</p>
                    <Link href="/projects/create" className="mt-4 text-sm font-semibold text-brand hover:underline">
                      {t("createFirst")}
                    </Link>
                  </div>
                ) : (
                  projects.map((p) => (
                    <Link
                      key={p.id}
                      href={`/projects/${p.id}`}
                      className="group rounded-card border border-line bg-surface p-4 transition-all hover:border-brand/40 hover:-translate-y-px"
                      style={{ boxShadow: "var(--sh-sm)" }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-[var(--clr-text)] group-hover:text-brand transition-colors truncate">{p.title}</h3>
                          {p.short_description && (
                            <p className="mt-1 text-xs text-[var(--clr-text-2)] line-clamp-2">{p.short_description}</p>
                          )}
                        </div>
                        <StatusBadge status={p.status} />
                      </div>
                    </Link>
                  ))
                )}
              </div>
            )}

            {/* Sub-tab: Beteiligungen */}
            {activeTab === "participations" && (
              <div className="flex flex-col gap-3">
                {participations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-line bg-surface py-20" style={{ boxShadow: "var(--sh-sm)" }}>
                    <p className="text-sm text-[var(--clr-text-2)]">{tProject("noParticipations")}</p>
                  </div>
                ) : (
                  participations.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => router.push(`/projects/${p.project_id}`)}
                      className="group rounded-card border border-line bg-surface p-4 transition-all hover:border-brand/40 hover:-translate-y-px cursor-pointer"
                      style={{ boxShadow: "var(--sh-sm)" }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate font-semibold text-[var(--clr-text)] group-hover:text-brand transition-colors">{p.project_title}</h3>
                          {p.amount && (
                            <p className="mt-1 text-xs text-[var(--clr-text-2)]">{p.amount.toLocaleString()} € · {new Date(p.created_at).toLocaleDateString()}</p>
                          )}
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                          p.status === "ACCEPTED"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : p.status === "REJECTED"
                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            : p.status === "WITHDRAWN"
                            ? "bg-gray-100 text-gray-600 dark:bg-gray-800/40 dark:text-gray-400"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        }`}>
                          {p.status === "ACCEPTED" ? tProject("joinApproved") : p.status === "REJECTED" ? tProject("joinRejected") : p.status === "WITHDRAWN" ? tProject("withdrawnStatus") : tProject("joinPending")}
                        </span>
                      </div>

                      {p.status === "ACCEPTED" && (
                        <div className="mt-1 flex flex-wrap gap-2" onClick={e => e.stopPropagation()}>
                          {withdrawResult[p.project_id] === "pending" ? (
                            <span className="text-xs text-amber-600">{tProject("withdrawRequestSent")}</span>
                          ) : withdrawResult[p.project_id] === "change_sent" ? (
                            <span className="text-xs text-[var(--clr-brand)]">{tProject("changeRequestInfo")}</span>
                          ) : (
                            <>
                              <Tooltip text={tt("editParticipation")} side="top">
                                <button
                                  onClick={() => setChangingId(changingId === p.id ? null : p.id)}
                                  className="text-xs text-[var(--clr-brand)] hover:underline"
                                >
                                  {tProject("editParticipation")}
                                </button>
                              </Tooltip>
                              <Tooltip text={tt("withdrawParticipation")} side="top">
                                <button
                                  onClick={() => handleWithdraw(p.project_id)}
                                  disabled={withdrawingId === p.project_id}
                                  className="text-xs text-red-500 hover:underline disabled:opacity-50"
                                >
                                  {withdrawingId === p.project_id ? "..." : tProject("withdrawParticipation")}
                                </button>
                              </Tooltip>
                            </>
                          )}
                          {changingId === p.id && (
                            <div className="mt-2 flex w-full gap-2">
                              <input
                                type="number"
                                min="100"
                                value={changeAmount}
                                onChange={e => setChangeAmount(e.target.value)}
                                placeholder={tProject("newAmount")}
                                className="flex-1 rounded-lg border border-[var(--clr-line)] bg-[var(--clr-bg)] px-3 py-1.5 text-sm outline-none focus:border-[var(--clr-brand)]"
                              />
                              <Tooltip text={tt("editParticipation")} side="top">
                                <button
                                  onClick={() => handleChangeAmount(p.project_id)}
                                  className="rounded-lg bg-[var(--clr-brand)] px-3 py-1.5 text-xs font-semibold text-white"
                                >
                                  ✓
                                </button>
                              </Tooltip>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}

                {requests.length > 0 && (
                  <div className="rounded-[var(--radius-card)] border border-[var(--clr-line)] bg-[var(--clr-surface)] p-5" style={{ boxShadow: "var(--sh-sm)" }}>
                    <div className="mb-3 flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-[var(--clr-text)]">{tProject("myRequests")}</h3>
                      <span className="rounded-full bg-[var(--clr-brand)]/10 px-2 py-0.5 text-xs font-semibold text-[var(--clr-brand)]">
                        {requests.length}
                      </span>
                    </div>
                    <ul className="space-y-3">
                      {requests.map((r) => (
                        <li key={r.id} className="flex items-start justify-between gap-3 rounded-xl border border-[var(--clr-line)] bg-[var(--clr-surface-2)] p-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-[var(--clr-text)]">{tProject(`requestTypeLabel.${r.type}`)}</p>
                            {r.project_title && <p className="text-xs text-[var(--clr-text-2)]">{r.project_title}</p>}
                            {r.admin_note && r.status === "REJECTED" && <p className="mt-1 text-xs text-red-500">{r.admin_note}</p>}
                            <p className="text-xs text-[var(--clr-text-3)]">{new Date(r.created_at).toLocaleDateString()}</p>
                          </div>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                            r.status === "ACCEPTED" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : r.status === "REJECTED" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                          }`}>
                            {r.status === "ACCEPTED" ? tProject("requestAccepted") : r.status === "REJECTED" ? tProject("requestRejected") : tProject("requestPending")}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
