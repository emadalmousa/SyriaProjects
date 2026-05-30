interface StatCardProps {
  label: string;
  value: number;
  icon: string;
  accent?: boolean;
}

export function StatCard({ label, value, icon, accent }: StatCardProps) {
  return (
    <div
      className={`rounded-card border p-5 ${
        accent
          ? "border-brand/30 bg-brand/5 dark:bg-brand/10"
          : "border-line bg-surface"
      }`}
      style={{ boxShadow: "var(--sh-sm)" }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--clr-text-2)]">{label}</p>
          <p className="mt-1 text-3xl font-bold text-[var(--clr-text)]">{value}</p>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  );
}
