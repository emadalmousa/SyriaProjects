import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size    = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  loadingLabel?: string;
}

const VARIANTS: Record<Variant, string> = {
  primary:   "bg-brand text-white shadow-xs hover:bg-brand-mid",
  secondary: "border border-line bg-surface-2 text-[var(--clr-text-2)] hover:border-brand/30 hover:text-[var(--clr-text)] dark:bg-surface",
  danger:    "border border-[var(--clr-danger-dim)] bg-[var(--clr-danger-dim)] text-[var(--clr-danger)] hover:bg-red-100 dark:border-red-800/40 dark:bg-red-900/20 dark:text-red-400",
  ghost:     "text-[var(--clr-text-2)] hover:text-[var(--clr-text)] hover:bg-surface-2",
};

const SIZES: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-3 text-sm",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  loadingLabel,
  disabled,
  children,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition active:scale-[.99] disabled:opacity-60 disabled:cursor-not-allowed
        ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {loading && (
        <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      )}
      {loading && loadingLabel ? loadingLabel : children}
    </button>
  );
}
