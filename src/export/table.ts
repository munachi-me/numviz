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
        .map((column) =>
          escapeCsvCell(
            format(column.value ? column.value(row) : row[column.field], row, column),
            delimiter
          )
        )
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
