type AlertType = "error" | "info" | "success" | "warning";

const STYLES: Record<AlertType, string> = {
  error:   "bg-[var(--clr-danger-dim)] text-[var(--clr-danger)] dark:bg-red-900/30 dark:text-red-400",
  info:    "bg-[var(--clr-info-dim)] text-[var(--clr-info)] dark:bg-blue-900/30 dark:text-blue-400",
  success: "bg-[var(--clr-ok-dim)] text-[var(--clr-ok)] dark:bg-emerald-900/30 dark:text-emerald-400",
  warning: "bg-[var(--clr-warn-dim)] text-[var(--clr-warn)] dark:bg-yellow-900/30 dark:text-yellow-400",
};

export function Alert({
  type,
  children,
  className = "",
}: {
  type: AlertType;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-lg px-4 py-3 text-sm ${STYLES[type]} ${className}`}>
      {children}
    </div>
  );
}
