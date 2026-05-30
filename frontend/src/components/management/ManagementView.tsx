"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { User } from "@/types";

import { PageSpinner } from "@/components/ui";
import { StatCard, ConfirmDialog, UserTable } from "@/components/management";

export function ManagementView() {
  const router = useRouter();
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

  return (
    <div className="min-h-screen bg-[var(--clr-bg)]">
      <div className="mx-auto max-w-screen-2xl px-5 py-8 sm:px-8">

        {/* Header */}
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-semibold text-[var(--clr-text)]">Admin-Bereich</h1>
            <p className="mt-0.5 text-sm text-[var(--clr-text-2)]">Nutzerverwaltung &amp; Plattformkontrolle</p>
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
                {testDataLoading ? "Wird ausgeführt…" : testDataStatus.exists ? "Testdaten löschen" : "Testdaten hinzufügen"}
              </button>
              {testDataStatus.exists && (
                <p className="text-xs text-[var(--clr-text-3)]">{testDataStatus.users} Testnutzer · {testDataStatus.projects} Testprojekte</p>
              )}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Nutzer gesamt" value={stats.total}   icon="👥" />
          <StatCard label="Admins"        value={stats.admins}  icon="🛡️" accent />
          <StatCard label="Aktiv"         value={stats.active}  icon="✅" />
          <StatCard label="Blockiert"     value={stats.blocked} icon="🚫" />
        </div>

        {/* Toolbar */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--clr-text-3)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
            </svg>
            <input
              type="search" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Suche nach Name, E-Mail, Land …"
              className="w-full rounded-lg border border-line bg-surface py-2 pl-10 pr-4 text-sm text-[var(--clr-text)] placeholder-[var(--clr-text-3)] outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)} className={selectCls}>
            <option value="ALL">Alle Rollen</option>
            <option value="ADMIN">Nur Admins</option>
            <option value="USER">Nur User</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className={selectCls}>
            <option value="ALL">Alle Status</option>
            <option value="ACTIVE">Aktiv</option>
            <option value="BLOCKED">Blockiert</option>
          </select>
          <span className="text-sm text-[var(--clr-text-3)]">{displayed.length} von {users.length}</span>
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
      </div>

      {confirmBlock && (
        <ConfirmDialog
          icon="🚫"
          title="Nutzer blockieren?"
          message={<><strong className="text-[var(--clr-text)]">{confirmBlock.full_name || confirmBlock.email}</strong> kann sich nach dem Blockieren nicht mehr einloggen.</>}
          confirmLabel="Blockieren"
          onConfirm={() => handleToggleActive(confirmBlock)}
          onCancel={() => setConfirmBlock(null)}
        />
      )}
    </div>
  );
}
