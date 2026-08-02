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
  const [tasksFilter, setTasksFilter] = useState<"all" | "projects" | "join" | "balance" | "other">("all");
  const [historyFilter, setHistoryFilter] = useState<"all" | "projects" | "join" | "balance" | "other">("all");
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

  const filterCls = (active: boolean) => `flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition border ${active ? "bg-[var(--clr-brand)] text-white border-[var(--clr-brand)]" : "border-[var(--clr-line)] text-[var(--clr-text-2)] hover:text-[var(--clr-text)] bg-[var(--clr-surface)]"}`;
  const kindLabel = (kind: string) =>
    kind === "project" ? t("filterProjects") :
    kind === "join" ? t("filterJoin") :
    kind === "balance" ? t("filterBalance") :
    t("filterOther");
  const kindColor = (kind: string) =>
    kind === "project" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
    kind === "join" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" :
    kind === "balance" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";

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
            ) : (() => {
              // Flatten all pending items into one unified list
              type TaskRow =
                | { kind: "project"; id: number; user: string; title: string; subtitle?: string; city?: string; detail: string; date: string }
                | { kind: "join";    id: number; user: string; email: string; title: string; detail: string; date: string; projectId: number }
                | { kind: "balance"; id: number; user: string; title: string; detail: string; date: string; documentUrl?: string }
                | { kind: "other";   id: number; user: string; title: string; detail: string; date: string; projectId?: number };

              const rows: TaskRow[] = [];
              (tasks?.idea_projects ?? []).forEach(p => rows.push({ kind: "project", id: p.id, user: p.creator || "—", title: p.title, subtitle: p.short_description || undefined, city: p.city || undefined, detail: "—", date: p.created_at }));
              (tasks?.pending_interests ?? []).forEach(i => rows.push({ kind: "join", id: i.id, user: i.user_name, email: i.user_email, title: i.project_title, detail: i.amount ? `${Number(i.amount).toLocaleString()} €` : "—", date: i.created_at, projectId: i.project_id }));
              (tasks?.pending_requests ?? []).forEach(r => {
                let detail = "—";
                let documentUrl: string | undefined;
                try {
                  const p = r.payload ? JSON.parse(r.payload) : {};
                  if (r.type === "CHANGE_BALANCE") { const cur = p.currency || "EUR"; detail = p.amount != null ? `+${Number(p.amount).toLocaleString()} ${cur}` : "—"; documentUrl = p.document_url; }
                  else if (p.amount) { detail = `${Number(p.amount).toLocaleString()} €`; }
                  else if (p.field) { detail = p.value ? `${p.field} → ${p.value}` : p.field; }
                } catch { /* ignore */ }
                if (r.type === "CHANGE_BALANCE") rows.push({ kind: "balance", id: r.id, user: r.requester_name || "—", title: tProject("requestTypeLabel.CHANGE_BALANCE"), detail, date: r.created_at, documentUrl });
                else rows.push({ kind: "other", id: r.id, user: r.requester_name || "—", title: tProject(`requestTypeLabel.${r.type}`), detail, date: r.created_at, projectId: r.project_id });
              });

              const counts = { all: rows.length, projects: rows.filter(r => r.kind === "project").length, join: rows.filter(r => r.kind === "join").length, balance: rows.filter(r => r.kind === "balance").length, other: rows.filter(r => r.kind === "other").length } as Record<string, number>;
              const filtered = tasksFilter === "all" ? rows : rows.filter(r => r.kind === (tasksFilter === "projects" ? "project" : tasksFilter));

              return (
                <>
                  {/* Filter bar */}
                  <div className="mb-5 flex flex-wrap gap-2">
                    {(["all", "projects", "join", "balance", "other"] as const).map(f => {
                      const disabled = f !== "all" && counts[f] === 0;
                      return (
                        <button key={f} onClick={() => !disabled && setTasksFilter(f)} disabled={disabled} className={`${filterCls(tasksFilter === f)} disabled:opacity-30 disabled:cursor-not-allowed`}>
                          {t(`filter${f.charAt(0).toUpperCase() + f.slice(1)}` as "filterAll")}
                          {counts[f] > 0 && <span className={`rounded-full px-1.5 py-0.5 text-xs font-bold leading-none ${tasksFilter === f ? "bg-white/20 text-white" : "bg-red-500 text-white"}`}>{counts[f]}</span>}
                        </button>
                      );
                    })}
                  </div>

                  {filtered.length === 0 ? (
                    <p className="text-sm text-[var(--clr-text-2)]">{t("noTasks")}</p>
                  ) : (
                    <div className="overflow-hidden rounded-card border border-line bg-surface" style={{ boxShadow: "var(--sh-sm)" }}>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="border-b border-line bg-surface-2">
                            <tr>
                              <th className="px-4 py-3 text-start font-semibold text-[var(--clr-text-2)]">{t("colType")}</th>
                              <th className="px-4 py-3 text-start font-semibold text-[var(--clr-text-2)]">{t("colUser")}</th>
                              <th className="px-4 py-3 text-start font-semibold text-[var(--clr-text-2)]">{t("colSubject")}</th>
                              <th className="px-4 py-3 text-start font-semibold text-[var(--clr-text-2)]">{t("colAmount")}</th>
                              <th className="px-4 py-3 text-start font-semibold text-[var(--clr-text-2)]">{t("colRegistered")}</th>
                              <th className="px-4 py-3 text-start font-semibold text-[var(--clr-text-2)]">{t("colActions")}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-line">
                            {filtered.map(row => {
                              const projectId = row.kind === "project" ? row.id : row.kind === "join" ? row.projectId : row.kind === "other" ? row.projectId : undefined;
                              return (
                                <tr key={`${row.kind}-${row.id}`} onClick={() => projectId && router.push(`/projects/${projectId}`)} className={`hover:bg-surface-2 transition-colors ${projectId ? "cursor-pointer" : ""}`}>
                                  <td className="px-4 py-3">
                                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${kindColor(row.kind)}`}>{kindLabel(row.kind)}</span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <p className="font-medium text-[var(--clr-text)]">{row.user}</p>
                                    {row.kind === "join" && <p className="text-xs text-[var(--clr-text-2)]">{row.email}</p>}
                                  </td>
                                  <td className="px-4 py-3">
                                    <p className="font-medium text-[var(--clr-text)]">{row.kind === "balance" ? "—" : row.title}</p>
                                    {row.kind === "project" && row.subtitle && <p className="text-xs text-[var(--clr-text-2)] line-clamp-1">{row.subtitle}</p>}
                                    {row.kind === "project" && row.city && <p className="text-xs text-[var(--clr-text-3)]">{row.city}</p>}
                                  </td>
                                  <td className="px-4 py-3 text-xs font-semibold text-[var(--clr-brand)]">
                                    <span>{row.detail}</span>
                                    {row.kind === "balance" && row.documentUrl && (
                                      <a href={row.documentUrl} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center gap-1 rounded-md border border-[var(--clr-line)] bg-[var(--clr-surface-2)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--clr-text-2)] hover:border-[var(--clr-brand)] hover:text-[var(--clr-brand)] transition-colors">
                                        <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                                        PDF
                                      </a>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-xs text-[var(--clr-text-3)]">{new Date(row.date).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" })}</td>
                                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                    <div className="flex gap-2">
                                      {row.kind === "project" && (<>
                                        <Tooltip text={tt("approveProject")} side="top"><button onClick={async () => { await api.admin.approveProject(row.id); setTasks(await api.admin.tasks() as AdminTasks); setHistory(await api.admin.history() as AdminHistory); }} className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700">{tCommon("approve")}</button></Tooltip>
                                        <Tooltip text={tt("rejectProject")} side="top"><button onClick={async () => { await api.admin.rejectProject(row.id); setTasks(await api.admin.tasks() as AdminTasks); setHistory(await api.admin.history() as AdminHistory); }} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700">{tCommon("reject")}</button></Tooltip>
                                      </>)}
                                      {row.kind === "join" && (<>
                                        <Tooltip text={tt("approveInterest")} side="top"><button onClick={async () => { await api.admin.approveInterest(row.id); setTasks(await api.admin.tasks() as AdminTasks); setHistory(await api.admin.history() as AdminHistory); }} className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700">{tCommon("approve")}</button></Tooltip>
                                        <Tooltip text={tt("rejectInterest")} side="top"><button onClick={async () => { await api.admin.rejectInterest(row.id); setTasks(await api.admin.tasks() as AdminTasks); setHistory(await api.admin.history() as AdminHistory); }} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700">{tCommon("reject")}</button></Tooltip>
                                      </>)}
                                      {(row.kind === "balance" || row.kind === "other") && (<>
                                        <Tooltip text={tt("approveRequest")} side="top"><button onClick={async () => { await api.admin.approveRequest(row.id); setTasks(await api.admin.tasks() as AdminTasks); setHistory(await api.admin.history() as AdminHistory); }} className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700">{tCommon("approve")}</button></Tooltip>
                                        <Tooltip text={tt("rejectRequest")} side="top"><button onClick={async () => { await api.admin.rejectRequest(row.id); setTasks(await api.admin.tasks() as AdminTasks); setHistory(await api.admin.history() as AdminHistory); }} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700">{tCommon("reject")}</button></Tooltip>
                                      </>)}
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
                </>
              );
            })()}
          </div>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <div>
            {historyLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-brand border-t-transparent" />
              </div>
            ) : (() => {
              type HistoryRow =
                | { kind: "project"; id: number; user: string; title: string; city?: string; detail: string; result: string; resultOk: boolean; date: string }
                | { kind: "join";    id: number; user: string; email: string; title: string; detail: string; result: string; resultOk: boolean; date: string; projectId: number }
                | { kind: "balance"; id: number; user: string; title: string; detail: string; result: string; resultOk: boolean; date: string; note?: string; documentUrl?: string }
                | { kind: "other";   id: number; user: string; title: string; detail: string; result: string; resultOk: boolean; date: string; note?: string; projectId?: number };

              const hrows: HistoryRow[] = [];
              (history?.reviewed_projects ?? []).forEach(p => hrows.push({ kind: "project", id: p.id, user: p.creator || "—", title: p.title, city: p.city || undefined, detail: "—", result: p.status === "ACTIVE" ? t("resultApproved") : t("resultRejected"), resultOk: p.status === "ACTIVE", date: p.decided_at }));
              (history?.reviewed_interests ?? []).forEach(i => hrows.push({ kind: "join", id: i.id, user: i.user_name || "—", email: i.user_email || "", title: i.project_title || "—", detail: i.amount ? `${Number(i.amount).toLocaleString()} €` : "—", result: i.status === "ACCEPTED" ? t("resultApproved") : t("resultRejected"), resultOk: i.status === "ACCEPTED", date: i.decided_at, projectId: i.project_id }));
              (history?.reviewed_requests ?? []).forEach(r => {
                let detail = "—";
                let documentUrl: string | undefined;
                try {
                  const p = r.payload ? JSON.parse(r.payload) : {};
                  if (r.type === "CHANGE_BALANCE") { const cur = p.currency || "EUR"; detail = p.amount != null ? `+${Number(p.amount).toLocaleString()} ${cur}` : "—"; documentUrl = p.document_url; }
                  else if (p.amount) { detail = `${Number(p.amount).toLocaleString()} €`; }
                  else if (p.field) { detail = p.value ? `${p.field} → ${p.value}` : p.field; }
                } catch { /* ignore */ }
                const ok = r.status === "ACCEPTED";
                if (r.type === "CHANGE_BALANCE") hrows.push({ kind: "balance", id: r.id, user: r.requester_name || "—", title: tProject("requestTypeLabel.CHANGE_BALANCE"), detail, result: ok ? t("resultApproved") : t("resultRejected"), resultOk: ok, date: r.decided_at, note: r.admin_note, documentUrl });
                else hrows.push({ kind: "other", id: r.id, user: r.requester_name || "—", title: tProject(`requestTypeLabel.${r.type}`), detail, result: ok ? t("resultApproved") : t("resultRejected"), resultOk: ok, date: r.decided_at, note: r.admin_note, projectId: r.project_id });
              });

              const counts = { all: hrows.length, projects: hrows.filter(r => r.kind === "project").length, join: hrows.filter(r => r.kind === "join").length, balance: hrows.filter(r => r.kind === "balance").length, other: hrows.filter(r => r.kind === "other").length } as Record<string, number>;
              const filtered = historyFilter === "all" ? hrows : hrows.filter(r => r.kind === (historyFilter === "projects" ? "project" : historyFilter));

              return (
                <>
                  {/* Filter bar */}
                  <div className="mb-5 flex flex-wrap gap-2">
                    {(["all", "projects", "join", "balance", "other"] as const).map(f => {
                      const disabled = f !== "all" && counts[f] === 0;
                      return (
                        <button key={f} onClick={() => !disabled && setHistoryFilter(f)} disabled={disabled} className={`${filterCls(historyFilter === f)} disabled:opacity-30 disabled:cursor-not-allowed`}>
                          {t(`filter${f.charAt(0).toUpperCase() + f.slice(1)}` as "filterAll")}
                          {counts[f] > 0 && <span className={`rounded-full px-1.5 py-0.5 text-xs font-bold leading-none ${historyFilter === f ? "bg-white/20 text-white" : "bg-[var(--clr-brand)]/10 text-[var(--clr-brand)]"}`}>{counts[f]}</span>}
                        </button>
                      );
                    })}
                  </div>

                  {filtered.length === 0 ? (
                    <p className="text-sm text-[var(--clr-text-2)]">{t("noHistoryItems")}</p>
                  ) : (
                    <div className="overflow-hidden rounded-card border border-line bg-surface" style={{ boxShadow: "var(--sh-sm)" }}>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="border-b border-line bg-surface-2">
                            <tr>
                              <th className="px-4 py-3 text-start font-semibold text-[var(--clr-text-2)]">{t("colType")}</th>
                              <th className="px-4 py-3 text-start font-semibold text-[var(--clr-text-2)]">{t("colRequester")}</th>
                              <th className="px-4 py-3 text-start font-semibold text-[var(--clr-text-2)]">{t("colSubject")}</th>
                              <th className="px-4 py-3 text-start font-semibold text-[var(--clr-text-2)]">{t("colAmount")}</th>
                              <th className="px-4 py-3 text-start font-semibold text-[var(--clr-text-2)]">{t("colResult")}</th>
                              <th className="px-4 py-3 text-start font-semibold text-[var(--clr-text-2)]">{t("colDecidedAt")}</th>
                              <th className="px-4 py-3 text-start font-semibold text-[var(--clr-text-2)]">{t("colActions")}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-line">
                            {filtered.map(row => {
                              const projectId = row.kind === "project" ? row.id : row.kind === "join" ? row.projectId : row.kind === "other" ? row.projectId : undefined;
                              return (
                                <tr key={`h-${row.kind}-${row.id}`} onClick={() => projectId && router.push(`/projects/${projectId}`)} className={`hover:bg-surface-2 transition-colors ${projectId ? "cursor-pointer" : ""}`}>
                                  <td className="px-4 py-3">
                                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${kindColor(row.kind)}`}>{kindLabel(row.kind)}</span>
                                    {row.kind !== "project" && row.kind !== "join" && (row as { note?: string }).note && <p className="mt-0.5 text-xs text-red-500">{(row as { note?: string }).note}</p>}
                                  </td>
                                  <td className="px-4 py-3">
                                    <p className="font-medium text-[var(--clr-text)]">{row.user}</p>
                                    {row.kind === "join" && <p className="text-xs text-[var(--clr-text-2)]">{row.email}</p>}
                                  </td>
                                  <td className="px-4 py-3">
                                    <p className="text-[var(--clr-text-2)]">{row.kind === "balance" ? "—" : row.title}</p>
                                    {row.kind === "project" && row.city && <p className="text-xs text-[var(--clr-text-3)]">{row.city}</p>}
                                  </td>
                                  <td className="px-4 py-3 text-xs font-semibold text-[var(--clr-brand)]">
                                    <span>{row.detail}</span>
                                    {row.kind === "balance" && row.documentUrl && (
                                      <a href={row.documentUrl} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center gap-1 rounded-md border border-[var(--clr-line)] bg-[var(--clr-surface-2)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--clr-text-2)] hover:border-[var(--clr-brand)] hover:text-[var(--clr-brand)] transition-colors">
                                        <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                                        PDF
                                      </a>
                                    )}
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${row.resultOk ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
                                      {row.result}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-xs text-[var(--clr-text-3)]">{new Date(row.date).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" })}</td>
                                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                    {row.kind === "project" && <Tooltip text={tt("reopenProject")} side="top"><button onClick={async () => { await api.admin.reopenProject(row.id); setTasks(await api.admin.tasks() as AdminTasks); setHistory(await api.admin.history() as AdminHistory); }} className="rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-xs font-semibold text-[var(--clr-text-2)] hover:border-brand hover:text-brand transition-colors">{t("reopen")}</button></Tooltip>}
                                    {row.kind === "join" && <Tooltip text={tt("reopenInterest")} side="top"><button onClick={async () => { await api.admin.reopenInterest(row.id); setTasks(await api.admin.tasks() as AdminTasks); setHistory(await api.admin.history() as AdminHistory); }} className="rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-xs font-semibold text-[var(--clr-text-2)] hover:border-brand hover:text-brand transition-colors">{t("reopen")}</button></Tooltip>}
                                    {(row.kind === "balance" || row.kind === "other") && <Tooltip text={tt("reopenRequest")} side="top"><button onClick={async () => { await api.admin.reopenRequest(row.id); setTasks(await api.admin.tasks() as AdminTasks); setHistory(await api.admin.history() as AdminHistory); }} className="rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-xs font-semibold text-[var(--clr-text-2)] hover:border-brand hover:text-brand transition-colors">{t("reopen")}</button></Tooltip>}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
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
