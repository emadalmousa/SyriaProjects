"use client";
import { useEffect, useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { api } from "@/lib/api";
import type { User, AdminTasks, SystemNotification, AdminRequest, AdminHistory, HistoryProject, HistoryInterest, HistoryRequest } from "@/types";

import { PageSpinner, Tooltip } from "@/components/ui";
import { StatCard, ConfirmDialog, UserTable } from "@/components/management";

export function ManagementView() {
  const router = useRouter();
  const t = useTranslations("management");
  const tCommon = useTranslations("common");
  const tProject = useTranslations("project");
  const tt = useTranslations("common.tooltip");

  const [me, setMe]       = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [roleFilter, setRoleFilter]     = useState<"ALL"|"ADMIN"|"USER">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL"|"ACTIVE"|"BLOCKED">("ALL");
  const [updating, setUpdating] = useState<number | null>(null);
  const [confirmBlock, setConfirmBlock] = useState<User | null>(null);
  const [testDataStatus, setTestDataStatus] = useState<{ exists: boolean; users: number; projects: number } | null>(null);
  const [testDataLoading, setTestDataLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<"tasks" | "history" | "notifications" | "users">("tasks");
  const [tasksSubTab, setTasksSubTab] = useState<"projects" | "requests">("projects");
  const [historySubTab, setHistorySubTab] = useState<"projects" | "requests">("projects");
  const [tasks, setTasks] = useState<AdminTasks | null>(null);
  const [history, setHistory] = useState<AdminHistory | null>(null);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [taskLoading, setTaskLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);

  useEffect(() => {
    api.users.me()
      .then((u) => {
        const me = u as User;
        if (me.global_role !== "ADMIN" && me.global_role !== "SUPERADMIN") { router.push("/dashboard"); return; }
        setMe(me);
        return Promise.all([api.users.list(), api.admin.testDataStatus()]);
      })
      .then((results) => {
        if (!results) return;
        const [userList, tdStatus] = results as [User[], { exists: boolean; users: number; projects: number }];
        setUsers(userList); setTestDataStatus(tdStatus);
      })
      .catch(() => router.push("/login"))
      .finally(() => setLoading(false));

    setTaskLoading(true);
    api.admin.tasks().then((data) => setTasks(data as AdminTasks)).finally(() => setTaskLoading(false));
    setHistoryLoading(true);
    api.admin.history().then((data) => setHistory(data as AdminHistory)).finally(() => setHistoryLoading(false));
    setNotifLoading(true);
    api.admin.notifications().then((data) => setNotifications(data as SystemNotification[])).finally(() => setNotifLoading(false));
  }, [router]);

  async function handleTestData() {
    if (!testDataStatus) return;
    setTestDataLoading(true);
    try {
      if (testDataStatus.exists) {
        await api.admin.deleteTestData();
        setUsers((prev) => prev.filter((u) => !(u as User & { is_test_data?: boolean }).is_test_data));
        setTestDataStatus({ exists: false, users: 0, projects: 0 });
      } else {
        const result = await api.admin.seedTestData() as { status: string; users: number; projects: number };
        setTestDataStatus({ exists: true, users: result.users, projects: result.projects });
        setUsers(await api.users.list() as User[]);
      }
    } finally { setTestDataLoading(false); }
  }

  async function handleRoleChange(userId: number, role: string) {
    setUpdating(userId);
    try { await api.users.updateRole(userId, role); setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, global_role: role as User["global_role"] } : u)); }
    finally { setUpdating(null); }
  }

  async function handleToggleActive(user: User) {
    setConfirmBlock(null); setUpdating(user.id);
    try { const updated = await api.users.toggleActive(user.id) as User; setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, is_active: updated.is_active } : u)); }
    finally { setUpdating(null); }
  }

  const stats = useMemo(() => ({
    total:   users.length,
    admins:  users.filter((u) => u.global_role === "ADMIN").length,
    active:  users.filter((u) => u.is_active).length,
    blocked: users.filter((u) => !u.is_active).length,
  }), [users]);

  const displayed = useMemo(() => {
    const q = search.toLowerCase();
    let result = users.filter((u) => {
      if (q && !`${u.email} ${u.full_name ?? ""} ${u.country ?? ""}`.toLowerCase().includes(q)) return false;
      if (roleFilter !== "ALL" && u.global_role !== roleFilter) return false;
      if (statusFilter === "ACTIVE"   && !u.is_active)  return false;
      if (statusFilter === "BLOCKED"  &&  u.is_active)  return false;
      return true;
    });
    return result;
  }, [users, search, roleFilter, statusFilter]);

  const selectCls = "rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-[var(--clr-text)] outline-none transition focus:border-brand dark:bg-surface";

  if (loading || !me) return <PageSpinner />;

  const taskCount = tasks
    ? tasks.idea_projects.length + tasks.pending_interests.length + (tasks.pending_requests?.length || 0)
    : 0;
  const historyCount = history
    ? history.reviewed_projects.length + history.reviewed_interests.length + history.reviewed_requests.length
    : 0;
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="min-h-screen bg-[var(--clr-bg)]">
      <div className="mx-auto max-w-screen-2xl px-5 py-8 sm:px-8">

        {/* Header */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-semibold text-[var(--clr-text)]">{t("title")}</h1>
            <p className="mt-0.5 text-sm text-[var(--clr-text-2)]">{t("subtitle")}</p>
          </div>
          {testDataStatus !== null && (
            <div className="flex flex-col items-end gap-1">
              <button
                onClick={handleTestData}
                disabled={testDataLoading}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50
                  ${testDataStatus.exists
                    ? "border-[var(--clr-danger-dim)] bg-[var(--clr-danger-dim)] text-[var(--clr-danger)] hover:bg-red-100 dark:border-red-800/40 dark:bg-red-900/20 dark:text-red-400"
                    : "border-[var(--clr-ok-dim)] bg-[var(--clr-ok-dim)] text-[var(--clr-ok)] hover:bg-emerald-100 dark:border-emerald-800/40 dark:bg-emerald-900/20 dark:text-emerald-400"
                  }`}
              >
                {testDataLoading
                  ? <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
                  : testDataStatus.exists
                    ? <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    : <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                }
                {testDataLoading ? t("running") : testDataStatus.exists ? t("deleteTestData") : t("addTestData")}
              </button>
              {testDataStatus.exists && (
                <p className="text-xs text-[var(--clr-text-3)]">{t("testDataLabel", { users: testDataStatus.users, projects: testDataStatus.projects })}</p>
              )}
            </div>
          )}
        </div>

        {/* Tab bar */}
        <div className="mb-6 flex gap-1 rounded-xl border border-[var(--clr-line)] bg-[var(--clr-surface-2)] p-1 w-fit">
          {(["tasks", "history", "notifications", "users"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition
                ${activeTab === tab
                  ? "bg-[var(--clr-brand)] text-white"
                  : "text-[var(--clr-text-2)] hover:text-[var(--clr-text)]"
                }`}
            >
              {tab === "tasks" ? tCommon("tasks") : tab === "history" ? tCommon("history") : tab === "notifications" ? tCommon("notifications") : tCommon("users")}
              {tab === "tasks" && taskCount > 0 && (
                <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-xs font-bold text-white leading-none">
                  {taskCount}
                </span>
              )}
              {tab === "history" && historyCount > 0 && (
                <span className={`rounded-full px-1.5 py-0.5 text-xs font-bold leading-none ${activeTab === "history" ? "bg-white/20 text-white" : "bg-[var(--clr-brand)]/10 text-[var(--clr-brand)]"}`}>
                  {historyCount}
                </span>
              )}
              {tab === "notifications" && unreadCount > 0 && (
                <span className="rounded-full bg-[var(--clr-brand-muted,#e0f0ff)] px-1.5 py-0.5 text-xs font-bold text-[var(--clr-brand)] leading-none">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tasks Tab */}
        {activeTab === "tasks" && (
          <div>
            {taskLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-brand border-t-transparent" />
              </div>
            ) : (
              <>
                {/* Sub-tabs */}
                <div className="mb-5 flex gap-1 rounded-xl border border-[var(--clr-line)] bg-[var(--clr-surface-2)] p-1 w-fit">
                  <button
                    onClick={() => setTasksSubTab("projects")}
                    className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition
                      ${tasksSubTab === "projects"
                        ? "bg-[var(--clr-brand)] text-white"
                        : "text-[var(--clr-text-2)] hover:text-[var(--clr-text)]"
                      }`}
                  >
                    {t("historyProjects")}
                    {(tasks?.idea_projects.length ?? 0) > 0 && (
                      <span className={`rounded-full px-1.5 py-0.5 text-xs font-bold leading-none ${tasksSubTab === "projects" ? "bg-white/20 text-white" : "bg-red-500 text-white"}`}>
                        {tasks!.idea_projects.length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setTasksSubTab("requests")}
                    className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition
                      ${tasksSubTab === "requests"
                        ? "bg-[var(--clr-brand)] text-white"
                        : "text-[var(--clr-text-2)] hover:text-[var(--clr-text)]"
                      }`}
                  >
                    {t("historyInterests")}
                    {((tasks?.pending_interests.length ?? 0) + (tasks?.pending_requests?.length ?? 0)) > 0 && (
                      <span className={`rounded-full px-1.5 py-0.5 text-xs font-bold leading-none ${tasksSubTab === "requests" ? "bg-white/20 text-white" : "bg-red-500 text-white"}`}>
                        {(tasks?.pending_interests.length ?? 0) + (tasks?.pending_requests?.length ?? 0)}
                      </span>
                    )}
                  </button>
                </div>

                {/* Sub-tab: Projekt */}
                {tasksSubTab === "projects" && (
                  <>
                    {!(tasks?.idea_projects.length) ? (
                      <p className="text-sm text-[var(--clr-text-2)]">{tCommon("noTasks")}</p>
                    ) : (
                      <div className="overflow-hidden rounded-card border border-line bg-surface" style={{ boxShadow: "var(--sh-sm)" }}>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="border-b border-line bg-surface-2">
                              <tr>
                                <th className="px-4 py-3 text-start font-semibold text-[var(--clr-text-2)]">{t("colUser")}</th>
                                <th className="px-4 py-3 text-start font-semibold text-[var(--clr-text-2)]">{t("colProject")}</th>
                                <th className="px-4 py-3 text-start font-semibold text-[var(--clr-text-2)]">{t("colRegistered")}</th>
                                <th className="px-4 py-3 text-start font-semibold text-[var(--clr-text-2)]">{t("colActions")}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-line">
                              {(tasks?.idea_projects ?? []).map((proj) => (
                                <tr key={`proj-${proj.id}`} onClick={() => router.push(`/projects/${proj.id}`)} className="cursor-pointer hover:bg-surface-2 transition-colors">
                                  <td className="px-4 py-3 text-[var(--clr-text-2)]">{proj.creator || "—"}</td>
                                  <td className="px-4 py-3">
                                    <p className="font-medium text-[var(--clr-text)]">{proj.title}</p>
                                    {proj.short_description && <p className="text-xs text-[var(--clr-text-2)] line-clamp-1">{proj.short_description}</p>}
                                    {proj.city && <p className="text-xs text-[var(--clr-text-3)]">{proj.city}</p>}
                                  </td>
                                  <td className="px-4 py-3 text-xs text-[var(--clr-text-3)]">{new Date(proj.created_at).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" })}</td>
                                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex gap-2">
                                      <Tooltip text={tt("approveProject")} side="top"><button onClick={async () => { await api.admin.approveProject(proj.id); setTasks(await api.admin.tasks() as AdminTasks); setHistory(await api.admin.history() as AdminHistory); }} className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700">{tCommon("approve")}</button></Tooltip>
                                      <Tooltip text={tt("rejectProject")} side="top"><button onClick={async () => { await api.admin.rejectProject(proj.id); setTasks(await api.admin.tasks() as AdminTasks); setHistory(await api.admin.history() as AdminHistory); }} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700">{tCommon("reject")}</button></Tooltip>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Sub-tab: Beitrittsanfrage */}
                {tasksSubTab === "requests" && (
                  <div className="space-y-6">
                    {/* Interests */}
                    {(tasks?.pending_interests.length ?? 0) > 0 && (
                      <div className="overflow-hidden rounded-card border border-line bg-surface" style={{ boxShadow: "var(--sh-sm)" }}>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="border-b border-line bg-surface-2">
                              <tr>
                                <th className="px-4 py-3 text-start font-semibold text-[var(--clr-text-2)]">{t("colUser")}</th>
                                <th className="px-4 py-3 text-start font-semibold text-[var(--clr-text-2)]">{t("colProject")}</th>
                                <th className="px-4 py-3 text-start font-semibold text-[var(--clr-text-2)]">{t("colAmount")}</th>
                                <th className="px-4 py-3 text-start font-semibold text-[var(--clr-text-2)]">{t("colRegistered")}</th>
                                <th className="px-4 py-3 text-start font-semibold text-[var(--clr-text-2)]">{t("colActions")}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-line">
                              {(tasks?.pending_interests ?? []).map((interest) => (
                                <tr key={`int-${interest.id}`} onClick={() => router.push(`/projects/${interest.project_id}`)} className="cursor-pointer hover:bg-surface-2 transition-colors">
                                  <td className="px-4 py-3">
                                    <p className="font-medium text-[var(--clr-text)]">{interest.user_name}</p>
                                    <p className="text-xs text-[var(--clr-text-2)]">{interest.user_email}</p>
                                  </td>
                                  <td className="px-4 py-3 text-[var(--clr-text-2)]">{interest.project_title}</td>
                                  <td className="px-4 py-3 text-sm font-semibold text-[var(--clr-brand)]">{interest.amount ? `${interest.amount.toLocaleString()} €` : "—"}</td>
                                  <td className="px-4 py-3 text-xs text-[var(--clr-text-3)]">{new Date(interest.created_at).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" })}</td>
                                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex gap-2">
                                      <Tooltip text={tt("approveInterest")} side="top"><button onClick={async () => { await api.admin.approveInterest(interest.id); setTasks(await api.admin.tasks() as AdminTasks); setHistory(await api.admin.history() as AdminHistory); }} className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700">{tCommon("approve")}</button></Tooltip>
                                      <Tooltip text={tt("rejectInterest")} side="top"><button onClick={async () => { await api.admin.rejectInterest(interest.id); setTasks(await api.admin.tasks() as AdminTasks); setHistory(await api.admin.history() as AdminHistory); }} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700">{tCommon("reject")}</button></Tooltip>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Requests */}
                    {(tasks?.pending_requests?.length ?? 0) > 0 && (
                      <div className="overflow-hidden rounded-card border border-line bg-surface" style={{ boxShadow: "var(--sh-sm)" }}>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="border-b border-line bg-surface-2">
                              <tr>
                                <th className="px-4 py-3 text-start font-semibold text-[var(--clr-text-2)]">{t("colType")}</th>
                                <th className="px-4 py-3 text-start font-semibold text-[var(--clr-text-2)]">{t("colUser")}</th>
                                <th className="px-4 py-3 text-start font-semibold text-[var(--clr-text-2)]">{t("colProject")}</th>
                                <th className="px-4 py-3 text-start font-semibold text-[var(--clr-text-2)]">{t("colAmount")}</th>
                                <th className="px-4 py-3 text-start font-semibold text-[var(--clr-text-2)]">{t("colRegistered")}</th>
                                <th className="px-4 py-3 text-start font-semibold text-[var(--clr-text-2)]">{t("colActions")}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-line">
                              {(tasks?.pending_requests ?? []).map((req: AdminRequest) => {
                                let detail = "";
                                try {
                                  const p = req.payload ? JSON.parse(req.payload) : {};
                                  if (p.amount) detail = `${Number(p.amount).toLocaleString()} €`;
                                  else if (p.field) detail = p.value ? `${p.field} → ${p.value}` : p.field;
                                } catch { /* ignore */ }
                                return (
                                  <tr key={`req-${req.id}`} onClick={() => req.project_id && router.push(`/projects/${req.project_id}`)} className={`hover:bg-surface-2 transition-colors ${req.project_id ? "cursor-pointer" : ""}`}>
                                    <td className="px-4 py-3">
                                      <p className="font-medium text-[var(--clr-text)]">{tProject(`requestTypeLabel.${req.type}`)}</p>
                                    </td>
                                    <td className="px-4 py-3 text-[var(--clr-text-2)]">{req.requester_name || "—"}</td>
                                    <td className="px-4 py-3 text-[var(--clr-text-2)]">{req.project_title || "—"}</td>
                                    <td className="px-4 py-3 text-xs text-[var(--clr-brand)]">{detail || "—"}</td>
                                    <td className="px-4 py-3 text-xs text-[var(--clr-text-3)]">{new Date(req.created_at).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" })}</td>
                                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                      <div className="flex gap-2">
                                        <Tooltip text={tt("approveRequest")} side="top"><button onClick={async () => { await api.admin.approveRequest(req.id); setTasks(await api.admin.tasks() as AdminTasks); setHistory(await api.admin.history() as AdminHistory); }} className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700">{tCommon("approve")}</button></Tooltip>
                                        <Tooltip text={tt("rejectRequest")} side="top"><button onClick={async () => { await api.admin.rejectRequest(req.id); setTasks(await api.admin.tasks() as AdminTasks); setHistory(await api.admin.history() as AdminHistory); }} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700">{tCommon("reject")}</button></Tooltip>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {(tasks?.pending_interests.length ?? 0) === 0 && (tasks?.pending_requests?.length ?? 0) === 0 && (
                      <p className="text-sm text-[var(--clr-text-2)]">{tCommon("noTasks")}</p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <div>
            {historyLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-brand border-t-transparent" />
              </div>
            ) : (
              <>
                {/* Sub-tabs */}
                <div className="mb-5 flex gap-1 rounded-xl border border-[var(--clr-line)] bg-[var(--clr-surface-2)] p-1 w-fit">
                  <button
                    onClick={() => setHistorySubTab("projects")}
                    className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition
                      ${historySubTab === "projects"
                        ? "bg-[var(--clr-brand)] text-white"
                        : "text-[var(--clr-text-2)] hover:text-[var(--clr-text)]"
                      }`}
                  >
                    {t("historyProjects")}
                    {(history?.reviewed_projects.length ?? 0) > 0 && (
                      <span className={`rounded-full px-1.5 py-0.5 text-xs font-bold leading-none ${historySubTab === "projects" ? "bg-white/20 text-white" : "bg-[var(--clr-brand)]/10 text-[var(--clr-brand)]"}`}>
                        {history!.reviewed_projects.length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setHistorySubTab("requests")}
                    className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition
                      ${historySubTab === "requests"
                        ? "bg-[var(--clr-brand)] text-white"
                        : "text-[var(--clr-text-2)] hover:text-[var(--clr-text)]"
                      }`}
                  >
                    {t("historyInterests")}
                    {((history?.reviewed_interests.length ?? 0) + (history?.reviewed_requests.length ?? 0)) > 0 && (
                      <span className={`rounded-full px-1.5 py-0.5 text-xs font-bold leading-none ${historySubTab === "requests" ? "bg-white/20 text-white" : "bg-[var(--clr-brand)]/10 text-[var(--clr-brand)]"}`}>
                        {(history?.reviewed_interests.length ?? 0) + (history?.reviewed_requests.length ?? 0)}
                      </span>
                    )}
                  </button>
                </div>

                {/* Sub-tab: Bearbeitete Projekte */}
                {historySubTab === "projects" && (
                  <>
                    {!history?.reviewed_projects.length ? (
                      <p className="text-sm text-[var(--clr-text-2)]">{t("noHistory")}</p>
                    ) : (
                      <div className="overflow-hidden rounded-card border border-line bg-surface" style={{ boxShadow: "var(--sh-sm)" }}>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="border-b border-line bg-surface-2">
                              <tr>
                                <th className="px-4 py-3 text-start font-semibold text-[var(--clr-text-2)]">{t("colProject")}</th>
                                <th className="px-4 py-3 text-start font-semibold text-[var(--clr-text-2)]">{t("colRequester")}</th>
                                <th className="px-4 py-3 text-start font-semibold text-[var(--clr-text-2)]">{t("colResult")}</th>
                                <th className="px-4 py-3 text-start font-semibold text-[var(--clr-text-2)]">{t("colDecidedAt")}</th>
                                <th className="px-4 py-3 text-start font-semibold text-[var(--clr-text-2)]">{t("colActions")}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-line">
                              {(history?.reviewed_projects ?? []).map((proj: HistoryProject) => (
                                <tr key={proj.id} onClick={() => router.push(`/projects/${proj.id}`)} className="cursor-pointer hover:bg-surface-2 transition-colors">
                                  <td className="px-4 py-3">
                                    <p className="font-medium text-[var(--clr-text)]">{proj.title}</p>
                                    {proj.city && <p className="text-xs text-[var(--clr-text-3)]">{proj.city}</p>}
                                  </td>
                                  <td className="px-4 py-3 text-[var(--clr-text-2)]">{proj.creator || "—"}</td>
                                  <td className="px-4 py-3">
                                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${proj.status === "ACTIVE" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
                                      {proj.status === "ACTIVE" ? t("resultApproved") : t("resultRejected")}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-xs text-[var(--clr-text-3)]">{new Date(proj.decided_at).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" })}</td>
                                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                    <Tooltip text={tt("reopenProject")} side="top"><button onClick={async () => { await api.admin.reopenProject(proj.id); setTasks(await api.admin.tasks() as AdminTasks); setHistory(await api.admin.history() as AdminHistory); }} className="rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-xs font-semibold text-[var(--clr-text-2)] hover:border-brand hover:text-brand transition-colors">{t("reopen")}</button></Tooltip>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Sub-tab: Bearbeitete Beitrittsanfragen (Interests + Requests) */}
                {historySubTab === "requests" && (
                  <div className="space-y-6">
                    {/* Interests */}
                    {(history?.reviewed_interests.length ?? 0) > 0 && (
                      <div className="overflow-hidden rounded-card border border-line bg-surface" style={{ boxShadow: "var(--sh-sm)" }}>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="border-b border-line bg-surface-2">
                              <tr>
                                <th className="px-4 py-3 text-start font-semibold text-[var(--clr-text-2)]">{t("colUser")}</th>
                                <th className="px-4 py-3 text-start font-semibold text-[var(--clr-text-2)]">{t("colProject")}</th>
                                <th className="px-4 py-3 text-start font-semibold text-[var(--clr-text-2)]">{t("colAmount")}</th>
                                <th className="px-4 py-3 text-start font-semibold text-[var(--clr-text-2)]">{t("colResult")}</th>
                                <th className="px-4 py-3 text-start font-semibold text-[var(--clr-text-2)]">{t("colDecidedAt")}</th>
                                <th className="px-4 py-3 text-start font-semibold text-[var(--clr-text-2)]">{t("colActions")}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-line">
                              {(history?.reviewed_interests ?? []).map((item: HistoryInterest) => (
                                <tr key={item.id} onClick={() => router.push(`/projects/${item.project_id}`)} className="cursor-pointer hover:bg-surface-2 transition-colors">
                                  <td className="px-4 py-3">
                                    <p className="font-medium text-[var(--clr-text)]">{item.user_name || "—"}</p>
                                    {item.user_email && <p className="text-xs text-[var(--clr-text-2)]">{item.user_email}</p>}
                                  </td>
                                  <td className="px-4 py-3 text-[var(--clr-text-2)]">{item.project_title || "—"}</td>
                                  <td className="px-4 py-3 text-sm font-semibold text-[var(--clr-brand)]">{item.amount ? `${item.amount.toLocaleString()} €` : "—"}</td>
                                  <td className="px-4 py-3">
                                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${item.status === "ACCEPTED" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
                                      {item.status === "ACCEPTED" ? t("resultApproved") : t("resultRejected")}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-xs text-[var(--clr-text-3)]">{new Date(item.decided_at).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" })}</td>
                                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                    <Tooltip text={tt("reopenInterest")} side="top"><button onClick={async () => { await api.admin.reopenInterest(item.id); setTasks(await api.admin.tasks() as AdminTasks); setHistory(await api.admin.history() as AdminHistory); }} className="rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-xs font-semibold text-[var(--clr-text-2)] hover:border-brand hover:text-brand transition-colors">{t("reopen")}</button></Tooltip>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Requests */}
                    {(history?.reviewed_requests.length ?? 0) > 0 && (
                      <div className="overflow-hidden rounded-card border border-line bg-surface" style={{ boxShadow: "var(--sh-sm)" }}>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="border-b border-line bg-surface-2">
                              <tr>
                                <th className="px-4 py-3 text-start font-semibold text-[var(--clr-text-2)]">{t("colType")}</th>
                                <th className="px-4 py-3 text-start font-semibold text-[var(--clr-text-2)]">{t("colRequester")}</th>
                                <th className="px-4 py-3 text-start font-semibold text-[var(--clr-text-2)]">{t("colProject")}</th>
                                <th className="px-4 py-3 text-start font-semibold text-[var(--clr-text-2)]">{t("colResult")}</th>
                                <th className="px-4 py-3 text-start font-semibold text-[var(--clr-text-2)]">{t("colDecidedAt")}</th>
                                <th className="px-4 py-3 text-start font-semibold text-[var(--clr-text-2)]">{t("colActions")}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-line">
                              {(history?.reviewed_requests ?? []).map((req: HistoryRequest) => (
                                <tr key={req.id} onClick={() => req.project_id && router.push(`/projects/${req.project_id}`)} className={`hover:bg-surface-2 transition-colors ${req.project_id ? "cursor-pointer" : ""}`}>
                                  <td className="px-4 py-3">
                                    <p className="font-medium text-[var(--clr-text)]">{tProject(`requestTypeLabel.${req.type}`)}</p>
                                    {req.admin_note && <p className="text-xs text-red-500">{req.admin_note}</p>}
                                  </td>
                                  <td className="px-4 py-3 text-[var(--clr-text-2)]">{req.requester_name || "—"}</td>
                                  <td className="px-4 py-3 text-[var(--clr-text-2)]">{req.project_title || "—"}</td>
                                  <td className="px-4 py-3">
                                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${req.status === "ACCEPTED" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
                                      {req.status === "ACCEPTED" ? t("resultApproved") : t("resultRejected")}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-xs text-[var(--clr-text-3)]">{new Date(req.decided_at).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" })}</td>
                                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                    <Tooltip text={tt("reopenRequest")} side="top"><button onClick={async () => { await api.admin.reopenRequest(req.id); setTasks(await api.admin.tasks() as AdminTasks); setHistory(await api.admin.history() as AdminHistory); }} className="rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-xs font-semibold text-[var(--clr-text-2)] hover:border-brand hover:text-brand transition-colors">{t("reopen")}</button></Tooltip>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {(history?.reviewed_interests.length ?? 0) === 0 && (history?.reviewed_requests.length ?? 0) === 0 && (
                      <p className="text-sm text-[var(--clr-text-2)]">{t("noHistory")}</p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === "notifications" && (
          <div>
            {notifLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-brand border-t-transparent" />
              </div>
            ) : (
              <>
                {notifications.length === 0 ? (
                  <p className="text-sm text-[var(--clr-text-2)]">{tCommon("noNotifications")}</p>
                ) : (
                  <ul className="space-y-2">
                    {notifications.map((n) => (
                      <li
                        key={n.id}
                        className={`flex items-start gap-3 rounded-xl border p-3 transition
                          ${!n.is_read
                            ? "border-[var(--clr-brand)]/30 bg-[var(--clr-brand)]/5"
                            : "border-[var(--clr-line)] bg-[var(--clr-surface)]"
                          }`}
                      >
                        <span className="mt-0.5 text-lg leading-none">
                          {n.type === "USER_REGISTERED" ? "\u{1F464}"
                            : n.type === "PROJECT_CREATED" ? "\u{1F4CB}"
                            : n.type === "JOIN_REQUESTED" ? "\u{1F64B}"
                            : n.type === "JOIN_ACCEPTED" ? "\u{2705}"
                            : n.type === "JOIN_REJECTED" ? "\u{274C}"
                            : n.type === "PROJECT_APPROVED" ? "\u{1F7E2}"
                            : n.type === "PROJECT_REJECTED" ? "\u{1F534}"
                            : "\u{2139}\u{FE0F}"}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm ${!n.is_read ? "font-semibold text-[var(--clr-text)]" : "text-[var(--clr-text-2)]"}`}>
                            {n.message}
                          </p>
                          <p className="text-xs text-[var(--clr-text-3)]">
                            {new Date(n.created_at).toLocaleString()}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <>
            {/* Stats */}
            <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatCard label={t("totalUsers")} value={stats.total}   icon={"\u{1F465}"} />
              <StatCard label={t("admins")}     value={stats.admins}  icon={"\u{1F6E1}\u{FE0F}"} accent />
              <StatCard label={t("active")}     value={stats.active}  icon={"\u{2705}"} />
              <StatCard label={t("blocked")}    value={stats.blocked} icon={"\u{1F6AB}"} />
            </div>

            {/* Toolbar */}
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-48">
                <svg className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--clr-text-3)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
                </svg>
                <input
                  type="search" value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("searchPlaceholder")}
                  className="w-full rounded-lg border border-line bg-surface py-2 ps-10 pe-4 text-sm text-[var(--clr-text)] placeholder-[var(--clr-text-3)] outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>
              <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)} className={selectCls}>
                <option value="ALL">{t("allRoles")}</option>
                <option value="ADMIN">{t("onlyAdmins")}</option>
                <option value="USER">{t("onlyUsers")}</option>
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className={selectCls}>
                <option value="ALL">{t("allStatus")}</option>
                <option value="ACTIVE">{t("active")}</option>
                <option value="BLOCKED">{t("blocked")}</option>
              </select>
              <span className="text-sm text-[var(--clr-text-3)]">{displayed.length} / {users.length}</span>
            </div>

            {/* Table */}
            <UserTable
              users={displayed}
              total={users.length}
              me={me}
              updating={updating}
              onRoleChange={handleRoleChange}
              onToggleActive={handleToggleActive}
              onConfirmBlock={setConfirmBlock}
            />
          </>
        )}

      </div>

      {confirmBlock && (
        <ConfirmDialog
          icon={"\u{1F6AB}"}
          title={t("confirmBlockTitle")}
          message={<><strong className="text-[var(--clr-text)]">{confirmBlock.full_name || confirmBlock.email}</strong> {t("confirmBlockBody", { name: "" })}</>}
          confirmLabel={t("confirmBlock")}
          onConfirm={() => handleToggleActive(confirmBlock)}
          onCancel={() => setConfirmBlock(null)}
        />
      )}
    </div>
  );
}
