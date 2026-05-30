export function AuthBrand({ title, subtitle }: { title?: string; subtitle?: string }) {
  return (
    <div className="mb-8 text-center">
      <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-card bg-brand font-display text-xl font-bold text-white">
        S
      </span>
      {title && (
        <h1 className="font-display text-2xl font-semibold text-[var(--clr-text)]">{title}</h1>
      )}
      {subtitle && (
        <p className="mt-1 text-sm text-[var(--clr-text-2)]">{subtitle}</p>
      )}
    </div>
  );
}
