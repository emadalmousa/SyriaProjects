"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { User } from "@/types";

const USER_TYPE_LABELS: Record<string, string> = {
  PROJECT_SUBMITTER: "Projekteinreicher",
  INVESTOR: "Investor",
  PARTNER: "Partner",
  OTHER: "Sonstiges",
};

const USER_TYPE_ICONS: Record<string, string> = {
  PROJECT_SUBMITTER: "📋",
  INVESTOR: "💰",
  PARTNER: "🤝",
  OTHER: "👤",
};

function Avatar({ user }: { user: User }) {
  const initials = [user.first_name, user.last_name]
    .filter(Boolean)
    .map((n) => n![0].toUpperCase())
    .join("") || user.email[0].toUpperCase();
  const colors = ["bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-cyan-500"];
  const color = colors[user.id % colors.length];
  if (user.avatar_url) {
    return <img src={user.avatar_url} alt={initials} className="h-9 w-9 rounded-full object-cover" />;
  }
  return (
    <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white ${color}`}>
      {initials}
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: string; color: string }) {
  return (
    <div className={`rounded-xl border p-5 ${color}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  );
}

type SortKey = "name" | "email" | "role" | "type" | "created";
type SortDir = "asc" | "desc";

export default function ManagementPage() {
  const router = useRouter();
  const [me, setMe] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | "ADMIN" | "USER">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "BLOCKED">("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("created");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
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
        setUsers(userList);
        setTestDataStatus(tdStatus);
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
        const updatedUsers = await api.users.list() as User[];
        setUsers(updatedUsers);
      }
    } finally {
      setTestDataLoading(false);
    }
  }

  async function handleRoleChange(userId: number, role: string) {
    setUpdating(userId);
    try {
      await api.users.updateRole(userId, role);
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, global_role: role as User["global_role"] } : u));
    } finally {
      setUpdating(null);
    }
  }

  async function handleToggleActive(user: User) {
    setConfirmBlock(null);
    setUpdating(user.id);
    try {
      const updated = await api.users.toggleActive(user.id) as User;
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, is_active: updated.is_active } : u));
    } finally {
      setUpdating(null);
    }
  }

  // ── Stats ────────────────────────────────────────────────────────────────

  const stats = useMemo(() => ({
    total: users.length,
    admins: users.filter((u) => u.global_role === "ADMIN").length,
    active: users.filter((u) => u.is_active).length,
    blocked: users.filter((u) => !u.is_active).length,
  }), [users]);

  // ── Filtered + sorted list ────────────────────────────────────────────────

  const displayed = useMemo(() => {
    const q = search.toLowerCase();
    let result = users.filter((u) => {
      if (q && !`${u.email} ${u.full_name ?? ""} ${u.country ?? ""}`.toLowerCase().includes(q)) return false;
      if (roleFilter !== "ALL" && u.global_role !== roleFilter) return false;
      if (statusFilter === "ACTIVE" && !u.is_active) return false;
      if (statusFilter === "BLOCKED" && u.is_active) return false;
      return true;
    });
    result = [...result].sort((a, b) => {
      let av = "", bv = "";
      if (sortKey === "name") { av = a.full_name ?? a.email; bv = b.full_name ?? b.email; }
      if (sortKey === "email") { av = a.email; bv = b.email; }
      if (sortKey === "role") { av = a.global_role; bv = b.global_role; }
      if (sortKey === "type") { av = a.user_type; bv = b.user_type; }
      if (sortKey === "created") { av = a.created_at ?? ""; bv = b.created_at ?? ""; }
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return result;
  }, [users, search, roleFilter, statusFilter, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <span className="ml-1 text-gray-300">↕</span>;
    return <span className="ml-1 text-blue-500">{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  if (loading || !me) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin-Bereich</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Nutzerverwaltung & Plattformkontrolle</p>
          </div>
          {testDataStatus !== null && (
            <div className="flex flex-col items-end gap-1">
              <button
                onClick={handleTestData}
                disabled={testDataLoading}
                className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition disabled:opacity-50
                  ${testDataStatus.exists
                    ? "border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                    : "border border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                  }`}
              >
                {testDataLoading ? (
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                ) : testDataStatus.exists ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                )}
                {testDataLoading
                  ? "Wird ausgeführt…"
                  : testDataStatus.exists
                    ? "Testdaten löschen"
                    : "Testdaten hinzufügen"}
              </button>
              {testDataStatus.exists && (
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {testDataStatus.users} Testnutzer · {testDataStatus.projects} Testprojekte
                </p>
              )}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Nutzer gesamt" value={stats.total} icon="👥" color="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" />
          <StatCard label="Admins" value={stats.admins} icon="🛡️" color="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" />
          <StatCard label="Aktiv" value={stats.active} icon="✅" color="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" />
          <StatCard label="Blockiert" value={stats.blocked} icon="🚫" color="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" />
        </div>

        {/* Toolbar */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Suche nach Name, E-Mail, Land …"
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:ring-blue-800/30"
            />
          </div>

          {/* Role filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          >
            <option value="ALL">Alle Rollen</option>
            <option value="ADMIN">Nur Admins</option>
            <option value="USER">Nur User</option>
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          >
            <option value="ALL">Alle Status</option>
            <option value="ACTIVE">Aktiv</option>
            <option value="BLOCKED">Blockiert</option>
          </select>

          <span className="text-sm text-gray-400 dark:text-gray-500">
            {displayed.length} von {users.length}
          </span>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">
                    <button onClick={() => toggleSort("name")} className="flex items-center hover:text-blue-600">
                      Nutzer <SortIcon k="name" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">
                    <button onClick={() => toggleSort("email")} className="flex items-center hover:text-blue-600">
                      E-Mail <SortIcon k="email" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">
                    <button onClick={() => toggleSort("type")} className="flex items-center hover:text-blue-600">
                      Typ <SortIcon k="type" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">
                    <button onClick={() => toggleSort("role")} className="flex items-center hover:text-blue-600">
                      Rolle <SortIcon k="role" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">
                    <button onClick={() => toggleSort("created")} className="flex items-center hover:text-blue-600">
                      Registriert <SortIcon k="created" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {displayed.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-400">Keine Nutzer gefunden</td>
                  </tr>
                )}
                {displayed.map((u) => {
                  const isMe = u.id === me.id;
                  const isLoading = updating === u.id;
                  return (
                    <tr
                      key={u.id}
                      className={`transition-colors ${!u.is_active ? "bg-red-50/40 dark:bg-red-900/10" : "hover:bg-gray-50 dark:hover:bg-gray-700/30"}`}
                    >
                      {/* Avatar + Name */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar user={u} />
                          <div>
                            <p className={`font-medium ${!u.is_active ? "text-gray-400" : "text-gray-900 dark:text-white"}`}>
                              {u.full_name || "—"}
                              {isMe && <span className="ml-1.5 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">Du</span>}
                            </p>
                            {u.country && <p className="text-xs text-gray-400">{u.country}</p>}
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{u.email}</td>

                      {/* Type */}
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                          <span>{USER_TYPE_ICONS[u.user_type] ?? "👤"}</span>
                          <span className="text-xs">{USER_TYPE_LABELS[u.user_type] ?? u.user_type}</span>
                        </span>
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3">
                        {isMe ? (
                          <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-600 dark:bg-rose-900/30 dark:text-rose-400">
                            🛡️ Admin (Du)
                          </span>
                        ) : (
                          <div className="relative inline-block">
                            <select
                              value={u.global_role}
                              disabled={isLoading}
                              onChange={(e) => handleRoleChange(u.id, e.target.value)}
                              className={`cursor-pointer appearance-none rounded-full border px-2.5 py-1 text-xs font-semibold outline-none transition
                                ${u.global_role === "ADMIN"
                                  ? "border-rose-200 bg-rose-100 text-rose-600 dark:border-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                                  : "border-gray-200 bg-gray-100 text-gray-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                                }
                                ${isLoading ? "opacity-50" : ""}`}
                            >
                              <option value="USER">👤 User</option>
                              <option value="ADMIN">🛡️ Admin</option>
                            </select>
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        {u.is_active ? (
                          <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            Aktiv
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs font-medium text-red-500 dark:text-red-400">
                            <span className="h-2 w-2 rounded-full bg-red-500" />
                            Blockiert
                          </span>
                        )}
                      </td>

                      {/* Registered */}
                      <td className="px-4 py-3 text-xs text-gray-400 dark:text-gray-500">
                        {u.created_at
                          ? new Date(u.created_at).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" })
                          : "—"}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        {!isMe && (
                          <button
                            disabled={isLoading}
                            onClick={() => u.is_active ? setConfirmBlock(u) : handleToggleActive(u)}
                            className={`flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition
                              ${u.is_active
                                ? "border-red-200 text-red-500 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                                : "border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                              }
                              ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                          >
                            {isLoading ? (
                              <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                              </svg>
                            ) : u.is_active ? (
                              <>🚫 Blockieren</>
                            ) : (
                              <>✅ Freigeben</>
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Confirm block dialog */}
      {confirmBlock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <span className="text-2xl">🚫</span>
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Nutzer blockieren?</h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              <strong>{confirmBlock.full_name || confirmBlock.email}</strong> kann sich nach dem Blockieren nicht mehr einloggen.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setConfirmBlock(null)}
                className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Abbrechen
              </button>
              <button
                onClick={() => handleToggleActive(confirmBlock)}
                className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Blockieren
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
