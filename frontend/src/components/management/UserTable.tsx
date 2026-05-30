"use client";
import { useState, useMemo } from "react";
import type { User } from "@/types";
import { Avatar } from "@/components/ui";

type SortKey = "name" | "email" | "role" | "type" | "created";
type SortDir = "asc" | "desc";

const USER_TYPE_LABELS: Record<string, string> = {
  PROJECT_SUBMITTER: "Projekteinreicher", INVESTOR: "Investor", PARTNER: "Partner", OTHER: "Sonstiges",
};
const USER_TYPE_ICONS: Record<string, string> = {
  PROJECT_SUBMITTER: "📋", INVESTOR: "💰", PARTNER: "🤝", OTHER: "👤",
};

interface UserTableProps {
  users: User[];
  total: number;
  me: User;
  updating: number | null;
  onRoleChange: (userId: number, role: string) => void;
  onToggleActive: (user: User) => void;
  onConfirmBlock: (user: User) => void;
}

export function UserTable({
  users,
  total,
  me,
  updating,
  onRoleChange,
  onToggleActive,
  onConfirmBlock,
}: UserTableProps) {
  const [sortKey, setSortKey]   = useState<SortKey>("created");
  const [sortDir, setSortDir]   = useState<SortDir>("desc");

  const displayed = useMemo(() => {
    return [...users].sort((a, b) => {
      let av = "", bv = "";
      if (sortKey === "name")    { av = a.full_name ?? a.email; bv = b.full_name ?? b.email; }
      if (sortKey === "email")   { av = a.email;     bv = b.email; }
      if (sortKey === "role")    { av = a.global_role; bv = b.global_role; }
      if (sortKey === "type")    { av = a.user_type;   bv = b.user_type; }
      if (sortKey === "created") { av = a.created_at ?? ""; bv = b.created_at ?? ""; }
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [users, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <span className="ml-1 text-[var(--clr-text-3)]">↕</span>;
    return <span className="ml-1 text-brand">{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface" style={{ boxShadow: "var(--sh-sm)" }}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-surface-2">
            <tr>
              {(["name","email","type","role"] as const).map((k) => (
                <th key={k} className="px-4 py-3 text-left">
                  <button onClick={() => toggleSort(k)} className="flex items-center font-semibold text-[var(--clr-text-2)] hover:text-[var(--clr-text)]">
                    {k === "name" ? "Nutzer" : k === "email" ? "E-Mail" : k === "type" ? "Typ" : "Rolle"}
                    <SortIcon k={k} />
                  </button>
                </th>
              ))}
              <th className="px-4 py-3 text-left font-semibold text-[var(--clr-text-2)]">Status</th>
              <th className="px-4 py-3 text-left">
                <button onClick={() => toggleSort("created")} className="flex items-center font-semibold text-[var(--clr-text-2)] hover:text-[var(--clr-text)]">
                  Registriert <SortIcon k="created" />
                </button>
              </th>
              <th className="px-4 py-3 text-left font-semibold text-[var(--clr-text-2)]">Aktionen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {displayed.length === 0 && (
              <tr><td colSpan={7} className="py-12 text-center text-[var(--clr-text-3)]">Keine Nutzer gefunden</td></tr>
            )}
            {displayed.map((u) => {
              const isMe = u.id === me.id;
              const isLoading = updating === u.id;
              return (
                <tr key={u.id} className={`transition-colors ${!u.is_active ? "bg-red-50/40 dark:bg-red-900/10" : "hover:bg-surface-2"}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar user={u} />
                      <div>
                        <p className={`font-medium ${!u.is_active ? "text-[var(--clr-text-3)]" : "text-[var(--clr-text)]"}`}>
                          {u.full_name || "—"}
                          {isMe && <span className="ml-1.5 rounded bg-[var(--clr-info-dim)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--clr-info)]">Du</span>}
                        </p>
                        {u.country && <p className="text-xs text-[var(--clr-text-3)]">{u.country}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--clr-text-2)]">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-[var(--clr-text-2)]">
                      {USER_TYPE_ICONS[u.user_type] ?? "👤"}
                      <span className="text-xs">{USER_TYPE_LABELS[u.user_type] ?? u.user_type}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {isMe ? (
                      <span className="rounded-pill bg-[var(--clr-danger-dim)] px-2.5 py-1 text-xs font-semibold text-[var(--clr-danger)]">🛡️ Admin (Du)</span>
                    ) : (
                      <select
                        value={u.global_role} disabled={isLoading}
                        onChange={(e) => onRoleChange(u.id, e.target.value)}
                        className={`cursor-pointer appearance-none rounded-pill border px-2.5 py-1 text-xs font-semibold outline-none transition
                          ${u.global_role === "ADMIN"
                            ? "border-[var(--clr-danger-dim)] bg-[var(--clr-danger-dim)] text-[var(--clr-danger)]"
                            : "border-line bg-surface-2 text-[var(--clr-text-2)]"
                          } ${isLoading ? "opacity-50" : ""}`}
                      >
                        <option value="USER">👤 User</option>
                        <option value="ADMIN">🛡️ Admin</option>
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {u.is_active
                      ? <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--clr-ok)]"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Aktiv</span>
                      : <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--clr-danger)]"><span className="h-1.5 w-1.5 rounded-full bg-red-500" />Blockiert</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--clr-text-3)]">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {!isMe && (
                      <button
                        disabled={isLoading}
                        onClick={() => u.is_active ? onConfirmBlock(u) : onToggleActive(u)}
                        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition
                          ${u.is_active
                            ? "border-[var(--clr-danger-dim)] bg-[var(--clr-danger-dim)] text-[var(--clr-danger)] hover:bg-red-100 dark:border-red-800/40 dark:bg-red-900/20 dark:text-red-400"
                            : "border-[var(--clr-ok-dim)] bg-[var(--clr-ok-dim)] text-[var(--clr-ok)] hover:bg-emerald-100 dark:border-emerald-800/40 dark:bg-emerald-900/20 dark:text-emerald-400"
                          } ${isLoading ? "cursor-not-allowed opacity-50" : ""}`}
                      >
                        {isLoading
                          ? <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
                          : u.is_active ? "🚫 Blockieren" : "✅ Freigeben"
                        }
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
  );
}
