const compactFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1
});

const standardFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2
});

/** Format a numeric axis or tooltip value for display. */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return Math.abs(value) >= 10_000 ? compactFormatter.format(value) : standardFormatter.format(value);
}

/** Format a category value (dates become ISO dates, null becomes an em dash). */
export function formatCategory(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "—";
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "number") return formatNumber(value);
  if (typeof value === "string") return value.length > 0 ? value : "—";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}
