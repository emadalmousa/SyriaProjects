"use client";

interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChange, placeholder = "Suchen …" }: SearchBarProps) {
  return (
    <div className="sticky top-0 z-40 border-b border-line bg-[var(--clr-bg)]/95 backdrop-blur-sm">
      <div className="mx-auto max-w-screen-2xl px-5 py-3 sm:px-8">
        <div className="relative">
          <svg
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--clr-text-3)]"
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="search"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-card border border-line bg-surface py-2.5 pl-10 pr-10 text-sm text-[var(--clr-text)] placeholder-[var(--clr-text-3)] outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 dark:bg-surface"
            style={{ boxShadow: "var(--sh-xs)" }}
          />
          {value && (
            <button
              onClick={() => onChange("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--clr-text-3)] hover:text-[var(--clr-text)]"
              aria-label="Suche löschen"
            >
              ×
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
