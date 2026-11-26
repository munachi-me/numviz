import type { ResolvedTableColumn, TableRow } from "./types.js";

export const EMPTY_CELL = "—";

export function isMissingCell(value: unknown): boolean {
  return value === null || value === undefined || value === "";
}

const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric"
};

function numberFormatter(locale: string, options?: Intl.NumberFormatOptions): Intl.NumberFormat {
  return new Intl.NumberFormat(locale, options);
}

/** Format a value using a column preset, custom formatter or the column type. */
export function formatCellValue(
  value: unknown,
  row: TableRow,
  column: ResolvedTableColumn,
  locale: string
): string {
  if (typeof column.format === "function") {
    return column.format(value, row, column);
  }
  if (isMissingCell(value)) return EMPTY_CELL;

  const preset = column.format ?? defaultPreset(column);
  if (preset === "number") {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return String(value);
    return numberFormatter(locale, column.formatOptions as Intl.NumberFormatOptions | undefined).format(
      numeric
    );
  }
  if (preset === "currency") {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return String(value);
    return numberFormatter(locale, {
      style: "currency",
      currency: column.currency ?? "USD",
      ...(column.formatOptions as Intl.NumberFormatOptions | undefined)
    }).format(numeric);
  }
  if (preset === "percent") {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return String(value);
    return numberFormatter(locale, {
      style: "percent",
      maximumFractionDigits: 2,
      ...(column.formatOptions as Intl.NumberFormatOptions | undefined)
    }).format(numeric);
  }
  if (preset === "date") {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return new Intl.DateTimeFormat(
        locale,
        (column.formatOptions as Intl.DateTimeFormatOptions | undefined) ?? DATE_OPTIONS
      ).format(value);
    }
    const parsed = new Date(String(value));
    if (!Number.isNaN(parsed.getTime())) {
      return new Intl.DateTimeFormat(
        locale,
        (column.formatOptions as Intl.DateTimeFormatOptions | undefined) ?? DATE_OPTIONS
      ).format(parsed);
    }
    return String(value);
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? EMPTY_CELL
      : new Intl.DateTimeFormat(locale, DATE_OPTIONS).format(value);
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

function defaultPreset(column: ResolvedTableColumn): "number" | "date" | "text" {
  if (column.type === "number") return "number";
  if (column.type === "date") return "date";
  return "text";
}
