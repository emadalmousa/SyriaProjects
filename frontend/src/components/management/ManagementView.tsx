"use client";
import { useEffect, useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { api } from "@/lib/api";
import type { User, AdminTasks, SystemNotification } from "@/types";

import { PageSpinner } from "@/components/ui";
import { StatCard, ConfirmDialog, UserTable } from "@/components/management";

export function ManagementView() {
  const router = useRouter();
  const t = useTranslations("management");
  const tCommon = useTranslations("common");
  const tProject = useTranslations("project");

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

  const [activeTab, setActiveTab] = useState<"tasks" | "notifications" | "users">("tasks");
  const [tasks, setTasks] = useState<AdminTasks | null>(null);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [taskLoading, setTaskLoading] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);

  useEffect(() => {
    api.users.me()
      .then((u) => {
        const me = u as User;
        if (me.global_role !== "ADMIN") { router.push("/dashboard"); return; }
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

    // Load tasks
    setTaskLoading(true);
    api.admin.tasks().then((data) => setTasks(data as AdminTasks)).finally(() => setTaskLoading(false));
    // Load notifications
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

  const taskCount = tasks ? tasks.idea_projects.length + tasks.pending_interests.length : 0;
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
          {(["tasks", "notifications", "users"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition
                ${activeTab === tab
                  ? "bg-[var(--clr-brand)] text-white"
                  : "text-[var(--clr-text-2)] hover:text-[var(--clr-text)]"
                }`}
            >
              {tab === "tasks" ? tCommon("tasks") : tab === "notifications" ? tCommon("notifications") : tCommon("users")}
              {tab === "tasks" && taskCount > 0 && (
                <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-xs font-bold text-white leading-none">
                  {taskCount}
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
          <div className="space-y-6">
            {taskLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-brand border-t-transparent" />
              </div>
            ) : (
              <>
                {/* Projects to review */}
                <section>
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--clr-text-2)]">
                    {tProject("newProjectTask")}
                    {tasks?.idea_projects.length ? ` (${tasks.idea_projects.length})` : ""}
                  </h3>
                  {!tasks?.idea_projects.length ? (
                    <p className="text-sm text-[var(--clr-text-2)]">{tCommon("noTasks")}</p>
                  ) : (
                    <div className="space-y-3">
                      {tasks.idea_projects.map((proj) => (
                        <div key={proj.id} className="flex items-start justify-between gap-4 rounded-xl border border-[var(--clr-line)] bg-[var(--clr-surface)] p-4">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-[var(--clr-text)]">{proj.title}</p>
                            {proj.short_description && (
                              <p className="mt-0.5 line-clamp-2 text-sm text-[var(--clr-text-2)]">{proj.short_description}</p>
                            )}
                            <p className="mt-1 text-xs text-[var(--clr-text-3)]">
                              {proj.creator} {proj.city ? `· ${proj.city}` : ""} · {new Date(proj.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex shrink-0 gap-2">
                            <button
                              onClick={async () => {
                                await api.admin.approveProject(proj.id);
                                const updated = await api.admin.tasks();
                                setTasks(updated as AdminTasks);
                              }}
                              className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700"
                            >
                              {tProject("approveProject")}
                            </button>
                            <button
                              onClick={async () => {
                                await api.admin.rejectProject(proj.id);
                                const updated = await api.admin.tasks();
                                setTasks(updated as AdminTasks);
                              }}
                              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                            >
                              {tProject("rejectProject")}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Join requests to review */}
                <section>
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--clr-text-2)]">
                    {tProject("newJoinTask")}
                    {tasks?.pending_interests.length ? ` (${tasks.pending_interests.length})` : ""}
                  </h3>
                  {!tasks?.pending_interests.length ? (
                    <p className="text-sm text-[var(--clr-text-2)]">{tCommon("noTasks")}</p>
                  ) : (
                    <div className="space-y-3">
                      {tasks.pending_interests.map((interest) => (
                        <div key={interest.id} className="flex items-start justify-between gap-4 rounded-xl border border-[var(--clr-line)] bg-[var(--clr-surface)] p-4">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-[var(--clr-text)]">{interest.user_name}</p>
                            <p className="text-sm text-[var(--clr-text-2)]">{interest.user_email}</p>
                            <p className="mt-1 text-sm text-[var(--clr-text)]">
                              Projekt: <span className="font-medium">{interest.project_title}</span>
                            </p>
                            {interest.amount && (
                              <p className="text-sm font-semibold text-[var(--clr-brand)]">
                                {interest.amount.toLocaleString()} €
                              </p>
                            )}
                            <p className="mt-1 text-xs text-[var(--clr-text-3)]">
                              {new Date(interest.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex shrink-0 gap-2">
                            <button
                              onClick={async () => {
                                await api.admin.approveInterest(interest.id);
                                const updated = await api.admin.tasks();
                                setTasks(updated as AdminTasks);
                              }}
                              className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700"
                            >
                              {tProject("approveJoin")}
                            </button>
                            <button
                              onClick={async () => {
                                await api.admin.rejectInterest(interest.id);
                                const updated = await api.admin.tasks();
                                setTasks(updated as AdminTasks);
                              }}
                              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                            >
                              {tProject("rejectJoin")}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
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
                <div className="mb-4 flex justify-end">
                  <button
                    onClick={async () => {
                      await api.admin.markAllRead();
                      const updated = await api.admin.notifications();
                      setNotifications(updated as SystemNotification[]);
                    }}
                    className="text-sm text-[var(--clr-brand)] hover:underline"
                  >
                    {tCommon("markAllRead")}
                  </button>
                </div>
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
                        {!n.is_read && (
                          <button
                            onClick={async () => {
                              await api.admin.markNotificationRead(n.id);
                              setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, is_read: true } : x));
                            }}
                            className="shrink-0 text-xs text-[var(--clr-text-3)] hover:text-[var(--clr-brand)]"
                            title="Als gelesen markieren"
                          >
                            {"✓"}
                          </button>
                        )}
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
              <div className="relative flex-1 min-w-[200px]">
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
