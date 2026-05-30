interface Chip {
  label: string;
  onRemove: () => void;
}

interface FilterChipsProps {
  count: number;
  chips: Chip[];
  onClearAll: () => void;
}

export function FilterChips({ count, chips, onClearAll }: FilterChipsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium text-[var(--clr-text-2)]">
        {count} {count === 1 ? "Projekt" : "Projekte"}
      </span>

      {chips.map((chip, i) => (
        <span
          key={i}
          className="flex items-center gap-1 rounded-pill border border-brand/30 bg-brand/10 px-3 py-1 text-xs font-medium text-brand dark:border-brand/40 dark:bg-brand/20"
        >
          {chip.label}
          <button
            onClick={chip.onRemove}
            className="ml-0.5 hover:text-brand-mid"
            aria-label="Filter entfernen"
          >
            ×
          </button>
        </span>
      ))}

      {chips.length > 1 && (
        <button
          onClick={onClearAll}
          className="text-xs text-[var(--clr-text-3)] underline hover:text-[var(--clr-text-2)]"
        >
          Alle löschen
        </button>
      )}
    </div>
  );
}
