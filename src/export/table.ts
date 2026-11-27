import type { ResolvedTableColumn, TableRow } from "../table/types.js";
import type {
  TableCSVExportOptions,
  TableHTMLExportOptions,
  TableJSONExportOptions
} from "./types.js";

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function escapeCsvCell(value: string, delimiter: string): string {
  if (
    value.includes(delimiter) ||
    value.includes('"') ||
    value.includes("\n") ||
    value.includes("\r")
  ) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

const DANGEROUS_CSV_PREFIX = /^[=+\-@\t\r\n]/u;
const LEADING_INVISIBLE = /^[\s\p{Cc}\p{Cf}\uFEFF]*/u;
const NEGATIVE_FORMATTED_NUMBER =
  /^-\s*(?:[A-Z]{3}\s+)?[\s$€£¥₹₩₽₺₴₦₱₫฿()]*\d[\d\s.,]*(?:[eE][+-]?\d+)?(?:\s*%|\s*[\s$€£¥₹₩₽₺₴₦₱₫฿()]*)?$/u;
const NEGATIVE_RAW_NUMBER = /^-\s*(?:\d[\d\s.,]*|\.\d[\d\s.,]*)(?:[eE][+-]?\d+)?$/u;

function isNegativeNumericValue(value: unknown, formatted: string): boolean {
  if (!NEGATIVE_FORMATTED_NUMBER.test(formatted)) return false;
  if (typeof value === "number") return Number.isFinite(value) && value <= 0;
  if (typeof value === "bigint") return value < 0n;
  return typeof value === "string" && NEGATIVE_RAW_NUMBER.test(value.trim());
}

/**
 * Prefix spreadsheet formula starters with an apostrophe. Leading whitespace,
 * control and format characters are ignored when detecting the prefix, but
 * genuine negative numeric values keep their numeric presentation.
 */
export function protectCsvCell(value: string, rawValue: unknown): string {
  if (value === "") return value;
  const stripped = value.replace(LEADING_INVISIBLE, "");
  if (!DANGEROUS_CSV_PREFIX.test(value) && !DANGEROUS_CSV_PREFIX.test(stripped)) return value;
  if (isNegativeNumericValue(rawValue, value)) return value;
  return `'${value}`;
}

export function tableCsv(
  rows: readonly TableRow[],
  columns: readonly ResolvedTableColumn[],
  format: (value: unknown, row: TableRow, column: ResolvedTableColumn) => string,
  options: TableCSVExportOptions
): string {
  const delimiter = options.delimiter ?? ",";
  const lineEnding = options.lineEnding ?? "\n";
  const lines: string[] = [];
  if (options.includeHeaders !== false) {
    lines.push(columns.map((column) => escapeCsvCell(column.label, delimiter)).join(delimiter));
  }
  for (const row of rows) {
    lines.push(
      columns
        .map((column) => {
          const rawValue = column.value ? column.value(row) : row[column.field];
          const formatted = format(rawValue, row, column);
          const value =
            options.formulaProtection === false ? formatted : protectCsvCell(formatted, rawValue);
          return escapeCsvCell(value, delimiter);
        })
        .join(delimiter)
    );
  }
  const output = lines.join(lineEnding);
  return options.bom ? `\uFEFF${output}` : output;
}

export function tableJson(
  rows: readonly TableRow[],
  columns: readonly ResolvedTableColumn[],
  format: (value: unknown, row: TableRow, column: ResolvedTableColumn) => string,
  options: TableJSONExportOptions
): string {
  const valueFor = (row: TableRow, column: ResolvedTableColumn): unknown => {
    const value = column.value ? column.value(row) : row[column.field];
    return options.raw ? (value ?? null) : format(value, row, column);
  };
  let output: unknown;
  if (options.format === "matrix") {
    const matrix: unknown[][] = [];
    if (options.includeHeaders !== false) matrix.push(columns.map((column) => column.label));
    for (const row of rows) matrix.push(columns.map((column) => valueFor(row, column)));
    output = matrix;
  } else {
    output = rows.map((row) => {
      const record: Record<string, unknown> = {};
      for (const column of columns) {
        record[options.useLabels ? column.label : column.field] = valueFor(row, column);
      }
      return record;
    });
  }
  return JSON.stringify(output, null, options.pretty ? 2 : undefined);
}

export function tableHtml(
  rows: readonly TableRow[],
  columns: readonly ResolvedTableColumn[],
  format: (value: unknown, row: TableRow, column: ResolvedTableColumn) => string,
  options: TableHTMLExportOptions,
  title?: string
): string {
  const head =
    options.includeHeaders === false
      ? ""
      : `<thead><tr>${columns
          .map((column) => `<th scope="col">${escapeHtml(column.label)}</th>`)
          .join("")}</tr></thead>`;
  const body = rows
    .map(
      (row) =>
        `<tr>${columns
          .map(
            (column) =>
              `<td style="text-align:${column.align}">${escapeHtml(
                format(column.value ? column.value(row) : row[column.field], row, column)
              )}</td>`
          )
          .join("")}</tr>`
    )
    .join("");
  const caption = options.includeTitle && title ? `<caption>${escapeHtml(title)}</caption>` : "";
  return `<table class="numviz-export-table">${caption}${head}<tbody>${body}</tbody></table>`;
}
