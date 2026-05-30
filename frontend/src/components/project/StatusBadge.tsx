import type { ProjectStatus } from "@/types";

export const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Entwurf", IDEA: "Idee", UNDER_REVIEW: "In Prüfung",
  NEEDS_MORE_INFO: "Mehr Infos nötig", FINANCIAL_PLAN_REQUIRED: "Finanzplan erforderlich",
  FINANCIAL_PLAN_PAID: "Finanzplan bezahlt", FINANCIAL_PLAN_DONE: "Finanzplan fertig",
  APPROVED: "Genehmigt", INTEREST_RECEIVED: "Interesse erhalten",
  CONTRACT: "Vertrag", FUNDED: "Finanziert", ACTIVE: "Aktiv",
  PAUSED: "Pausiert", COMPLETED: "Abgeschlossen", SOLD: "Verkauft",
  REJECTED: "Abgelehnt", CANCELLED: "Abgebrochen",
};

export const STATUS_COLORS: Record<string, string> = {
  ACTIVE:    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  APPROVED:  "bg-[var(--clr-info-dim)] text-[var(--clr-info)] dark:bg-blue-900/30 dark:text-blue-400",
  FUNDED:    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  CONTRACT:  "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
  REJECTED:  "bg-[var(--clr-danger-dim)] text-[var(--clr-danger)] dark:bg-red-900/30 dark:text-red-400",
  PAUSED:    "bg-[var(--clr-warn-dim)] text-[var(--clr-warn)] dark:bg-yellow-900/30 dark:text-yellow-400",
  COMPLETED: "bg-surface-2 text-[var(--clr-text-2)] dark:bg-gray-700 dark:text-gray-300",
  IDEA:      "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400",
};

export const ALL_STATUSES: ProjectStatus[] = [
  "DRAFT","IDEA","UNDER_REVIEW","NEEDS_MORE_INFO",
  "FINANCIAL_PLAN_REQUIRED","FINANCIAL_PLAN_PAID","FINANCIAL_PLAN_DONE",
  "APPROVED","INTEREST_RECEIVED","CONTRACT","FUNDED",
  "ACTIVE","PAUSED","COMPLETED","SOLD","REJECTED","CANCELLED",
];

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const color = STATUS_COLORS[status] ?? "bg-surface-2 text-[var(--clr-text-2)]";
  return (
    <span className={`rounded-pill px-3 py-1 text-xs font-semibold ${color} ${className}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

interface StatusSelectProps {
  status: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  loading?: boolean;
}

export function StatusSelect({ status, disabled, onChange, loading }: StatusSelectProps) {
  const color = STATUS_COLORS[status] ?? "bg-[var(--clr-info-dim)] text-[var(--clr-info)]";
  return (
    <div className="relative">
      <select
        value={status}
        disabled={disabled || loading}
        onChange={(e) => onChange(e.target.value)}
        className={`cursor-pointer appearance-none rounded-pill border py-1 pl-3 pr-6 text-xs font-semibold outline-none transition
          ${loading ? "opacity-50" : ""} ${color}`}
      >
        {ALL_STATUSES.map((s) => (
          <option key={s} value={s} className="bg-white text-gray-900 dark:bg-gray-800 dark:text-white">
            {STATUS_LABELS[s]}
          </option>
        ))}
      </select>
      <svg className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
      {loading && (
        <span className="absolute -right-5 top-1/2 -translate-y-1/2">
          <svg className="h-3 w-3 animate-spin text-brand" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        </span>
      )}
    </div>
  );
}
