"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { api } from "@/lib/api";
import type { User, Project, UserInterest, AdminRequest } from "@/types";
import { Alert, Button, Avatar, PageSpinner } from "@/components/ui";
import { InputField, SelectField } from "@/components/ui";
import { PageHeader } from "@/components/layout";
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

  const [user, setUser]       = useState<User | null>(null);
  const [form, setForm]       = useState({ first_name: "", last_name: "", phone: "", country: "" });
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

  useEffect(() => {
    api.users.me()
      .then((u) => {
        const me = u as User;
        setUser(me);
        setForm({ first_name: me.first_name || "", last_name: me.last_name || "", phone: me.phone || "", country: me.country || "" });
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setSuccess(false);
    if (!form.first_name.trim()) { setError(t("firstName") + " required"); return; }
    setLoading(true);
    try { const updated = await api.users.updateProfile(form) as User; setUser(updated); setSuccess(true); }
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
    <div className="bg-[var(--clr-bg)]">
      <div className="mx-auto max-w-screen-xl px-5 py-10 sm:px-8">

        <PageHeader title={t("title")} backHref="/dashboard" backLabel={t("back")} />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1px_1fr] gap-6">

          {/* Left: Profile data */}
          <Card className="p-8" style={{ boxShadow: "var(--sh-md)" }}>

            {/* Avatar + info */}
            <div className="mb-8 flex items-center gap-4">
              <Avatar user={user} size="lg" />
              <div>
                <p className="font-semibold text-[var(--clr-text)]">
                  {[user.first_name, user.last_name].filter(Boolean).join(" ") || "—"}
                </p>
                <p className="text-sm text-[var(--clr-text-2)]">{user.email}</p>
                <span className="mt-1 inline-block rounded-lg border border-line bg-surface-2 px-2.5 py-0.5 text-xs font-semibold text-[var(--clr-text-2)]">
                  {user.global_role}
                </span>
              </div>
            </div>

            {success && <Alert type="success" className="mb-5">{t("saveSuccess")}</Alert>}
            {error   && <Alert type="error"   className="mb-5">{error}</Alert>}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <InputField label={t("firstName")} type="text" value={form.first_name} onChange={(e) => set("first_name", e.target.value)} placeholder="Ahmad" required />
                <InputField label={t("lastName")} type="text" value={form.last_name} onChange={(e) => set("last_name", e.target.value)} placeholder="Al-Halabi" />
              </div>

              <InputField label={t("email")} type="email" value={user.email} disabled />

              <div className="grid grid-cols-2 gap-3">
                <InputField label={t("phone")} type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+49 123 456789" />
                <SelectField label={t("country")} value={form.country} onChange={(e) => set("country", e.target.value)}>
                  <option value="">{t("countryPlaceholder")}</option>
                  {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </SelectField>
              </div>

              <Button type="submit" loading={loading} loadingLabel={t("saving")} className="mt-2 w-full" size="lg">
                {t("save")}
              </Button>
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
          </Card>

          {/* Divider */}
          <div className="hidden lg:block w-px bg-line self-stretch" />

          {/* Right: My Projects + My Participations + My Requests */}
          <div className="flex flex-col gap-6">

            {/* My Projects */}
            <div className="flex flex-col">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold text-[var(--clr-text)]">
                  {t("myProjects")}
                  {projects.length > 0 && (
                    <span className="ms-2 rounded-pill bg-brand/10 px-2 py-0.5 text-sm font-bold text-brand">
                      {projects.length}
                    </span>
                  )}
                </h2>
                <Link href="/projects/create">
                  <Button size="sm">{t("newProject")}</Button>
                </Link>
              </div>

              {projectsLoading ? (
                <div className="flex flex-1 items-center justify-center py-16">
                  <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-brand border-t-transparent" />
                </div>
              ) : projects.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center rounded-card border border-dashed border-line bg-surface py-16" style={{ boxShadow: "var(--sh-sm)" }}>
                  <span className="mb-3 text-4xl">{"\u{1F4CB}"}</span>
                  <p className="font-medium text-[var(--clr-text-2)]">{t("noProjects")}</p>
                  <Link href="/projects/create" className="mt-4 text-sm font-semibold text-brand hover:underline">
                    {t("createFirst")}
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col gap-3 overflow-y-auto">
                  {projects.map((p) => (
                    <Link
                      key={p.id}
                      href={`/projects/${p.id}`}
                      className="group rounded-card border border-line bg-surface p-4 transition-all hover:border-brand/40 hover:-translate-y-px"
                      style={{ boxShadow: "var(--sh-sm)" }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-[var(--clr-text)] group-hover:text-brand transition-colors truncate">
                            {p.title}
                          </h3>
                          {p.short_description && (
                            <p className="mt-1 text-xs text-[var(--clr-text-2)] line-clamp-2">{p.short_description}</p>
                          )}
                        </div>
                        <StatusBadge status={p.status} />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* My Participations */}
            <div className="rounded-[var(--radius-card)] border border-[var(--clr-line)] bg-[var(--clr-surface)] p-6">
              <div className="mb-4 flex items-center gap-2">
                <h2 className="text-base font-semibold text-[var(--clr-text)]">
                  {tProject("myParticipations")}
                </h2>
                {participations.length > 0 && (
                  <span className="rounded-full bg-[var(--clr-brand)]/10 px-2 py-0.5 text-xs font-semibold text-[var(--clr-brand)]">
                    {participations.length}
                  </span>
                )}
              </div>
              {participations.length === 0 ? (
                <p className="text-sm text-[var(--clr-text-2)]">{tProject("noParticipations")}</p>
              ) : (
                <ul className="space-y-3">
                  {participations.map((p) => (
                    <li key={p.id} className="flex flex-col gap-2 rounded-xl border border-[var(--clr-line)] bg-[var(--clr-surface-2)] p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-[var(--clr-text)]">{p.project_title}</p>
                          {p.amount && (
                            <p className="text-xs text-[var(--clr-text-2)]">{p.amount.toLocaleString()} €</p>
                          )}
                          <p className="text-xs text-[var(--clr-text-3)]">
                            {new Date(p.created_at).toLocaleDateString()}
                          </p>
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
                          {p.status === "ACCEPTED" ? tProject("joinApproved") : p.status === "REJECTED" ? tProject("joinRejected") : p.status === "WITHDRAWN" ? tProject("withdrawParticipation") : tProject("joinPending")}
                        </span>
                      </div>

                      {p.status === "ACCEPTED" && (
                        <div className="mt-1 flex flex-wrap gap-2">
                          {withdrawResult[p.project_id] === "pending" ? (
                            <span className="text-xs text-amber-600">{tProject("withdrawRequestSent")}</span>
                          ) : withdrawResult[p.project_id] === "change_sent" ? (
                            <span className="text-xs text-[var(--clr-brand)]">{tProject("changeRequestInfo")}</span>
                          ) : (
                            <>
                              <button
                                onClick={() => setChangingId(changingId === p.id ? null : p.id)}
                                className="text-xs text-[var(--clr-brand)] hover:underline"
                              >
                                {tProject("editParticipation")}
                              </button>
                              <button
                                onClick={() => handleWithdraw(p.project_id)}
                                disabled={withdrawingId === p.project_id}
                                className="text-xs text-red-500 hover:underline disabled:opacity-50"
                              >
                                {withdrawingId === p.project_id ? "..." : tProject("withdrawParticipation")}
                              </button>
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
                              <button
                                onClick={() => handleChangeAmount(p.project_id)}
                                className="rounded-lg bg-[var(--clr-brand)] px-3 py-1.5 text-xs font-semibold text-white"
                              >
                                ✓
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* My Requests */}
            {requests.length > 0 && (
              <div className="rounded-[var(--radius-card)] border border-[var(--clr-line)] bg-[var(--clr-surface)] p-6">
                <div className="mb-4 flex items-center gap-2">
                  <h2 className="text-base font-semibold text-[var(--clr-text)]">{tProject("myRequests")}</h2>
                  <span className="rounded-full bg-[var(--clr-brand)]/10 px-2 py-0.5 text-xs font-semibold text-[var(--clr-brand)]">
                    {requests.length}
                  </span>
                </div>
                <ul className="space-y-3">
                  {requests.map((r) => (
                    <li key={r.id} className="flex items-start justify-between gap-3 rounded-xl border border-[var(--clr-line)] bg-[var(--clr-surface-2)] p-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[var(--clr-text)]">
                          {tProject(`requestTypeLabel.${r.type}`)}
                        </p>
                        {r.project_title && (
                          <p className="text-xs text-[var(--clr-text-2)]">{r.project_title}</p>
                        )}
                        {r.admin_note && r.status === "REJECTED" && (
                          <p className="mt-1 text-xs text-red-500">{r.admin_note}</p>
                        )}
                        <p className="text-xs text-[var(--clr-text-3)]">
                          {new Date(r.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                        r.status === "ACCEPTED"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : r.status === "REJECTED"
                          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
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

        </div>
      </div>
    </div>
  );
}
