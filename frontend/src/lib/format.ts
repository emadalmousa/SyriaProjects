export function formatMoney(value: number | string | null | undefined, currency?: string): string {
  const n = Number(value);
  if (isNaN(n)) return "—";
  const formatted = n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency ? `${formatted} ${currency}` : formatted;
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return "0,00 %";
  return value.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " %";
}
