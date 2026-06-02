interface SectionCardProps {
  title?: string;
  step?: number;
  children: React.ReactNode;
  className?: string;
}

export function SectionCard({ title, step, children, className = "" }: SectionCardProps) {
  return (
    <div
      className={`rounded-card border border-line bg-surface p-6 ${className}`}
      style={{ boxShadow: "var(--sh-sm)" }}
    >
      {title && (
        <h2 className="mb-5 font-display text-base font-semibold text-[var(--clr-text)]">
          {step !== undefined && (
            <span className="me-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
              {step}
            </span>
          )}
          {title}
        </h2>
      )}
      {children}
    </div>
  );
}
