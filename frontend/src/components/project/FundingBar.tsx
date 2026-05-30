interface FundingBarProps {
  progress: number;
  className?: string;
}

export function FundingBar({ progress, className = "" }: FundingBarProps) {
  if (progress <= 0) return null;
  const pct = Math.min(progress, 100);
  return (
    <div className={`h-1 w-full overflow-hidden rounded-pill bg-surface-2 ${className}`}>
      <div
        className="h-full rounded-pill bg-gradient-to-r from-emerald-500 to-brand transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
