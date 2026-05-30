import Link from "next/link";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, backHref, backLabel = "Zurück", actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-center gap-3">
        {backHref && (
          <Link
            href={backHref}
            className="flex items-center gap-1.5 text-sm text-[var(--clr-text-2)] transition hover:text-[var(--clr-text)]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            {backLabel}
          </Link>
        )}
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--clr-text)]">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-[var(--clr-text-2)]">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
