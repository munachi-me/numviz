import { describe, expect, it } from "vitest";
import { createTable } from "../src/index.js";
import type { TableCSVExportOptions, TableColumnConfig } from "../src/index.js";

function exportCell(value: unknown, column: TableColumnConfig = {}): string {
  const table = createTable({
    data: [{ value }],
    columns: [{ field: "value", label: "Value", ...column }]
  });
  const csv = table.toCSV({ includeHeaders: false });
  table.destroy();
  return csv;
}

function exportTable(
  data: readonly Record<string, unknown>[],
  columns: readonly TableColumnConfig[],
  options: TableCSVExportOptions = {}
): string {
  const table = createTable({ data, columns });
  const csv = table.toCSV(options);
  table.destroy();
  return csv;
}

describe("CSV formula injection protection", () => {
  it.each([
    "=1+1",
    "+SUM(A1:A5)",
    "-1+1",
    "@SUM(A1:A5)",
    "\t=1+1",
    "  =1+1",
    " \t =1+1",
    "\u00a0=1+1",
    "\u200b=1+1",
    "\u0000=1+1"
  ])("prefixes dangerous cell %j", (value) => {
    expect(exportCell(value).startsWith("'")).toBe(true);
  });

  it("prefixes carriage-return and line-feed prefixed formulas", () => {
    expect(exportCell("\r=1+1")).toBe("\"'\r=1+1\"");
    expect(exportCell("\n=1+1")).toBe("\"'\n=1+1\"");
  });

  it("preserves legitimate negative numbers and negative formatted values", () => {
    expect(exportCell(-5, { type: "number", format: "number" })).toBe("-5");
    expect(exportCell(-1200, { type: "number", format: "currency" })).toBe('"-$1,200.00"');
    expect(exportCell("-5", { type: "string" })).toBe("-5");
    expect(exportCell(-5.5, { format: (value) => `${String(value)}%` })).toBe("-5.5%");
    expect(exportCell(-1200, { format: () => "-$1,200.00" })).toBe('"-$1,200.00"');
  });

  it("does not prefix ordinary text, Unicode, null or undefined", () => {
    expect(exportCell("hello")).toBe("hello");
    expect(exportCell("Ünïcode 漢字")).toBe("Ünïcode 漢字");
    expect(exportCell(null)).toBe("—");
    expect(exportCell(undefined)).toBe("—");
  });

  it("preserves quoting for commas, quotes and newlines after sanitization", () => {
    expect(exportCell('=1,2"3')).toBe('"\'=1,2""3"');
    expect(exportCell("line\nbreak")).toBe('"line\nbreak"');
    expect(exportCell("line\r\nbreak")).toBe('"line\r\nbreak"');
  });

  it("protects custom formatted values even when the raw value is negative", () => {
    expect(exportCell(-5, { format: () => "-1+1" })).toBe("'-1+1");
    expect(exportCell(-5, { format: () => "=1+1" })).toBe("'=1+1");
    expect(exportCell(-5, { format: () => "-SUM(A1:A5)" })).toBe("'-SUM(A1:A5)");
    expect(exportCell("safe", { format: () => "@SUM(A1:A5)" })).toBe("'@SUM(A1:A5)");
  });

  it("allows formula protection to be disabled explicitly", () => {
    expect(exportCell("=1+1", {})).toBe("'=1+1");
    const table = createTable({
      data: [{ value: "=1+1" }],
      columns: [{ field: "value", label: "Value" }]
    });
    expect(table.toCSV({ includeHeaders: false, formulaProtection: false })).toBe("=1+1");
    table.destroy();
  });

  it("does not sanitize column headers", () => {
    const csv = exportTable([{ value: "safe" }], [
      { field: "value", label: "=Danger" }
    ]);
    expect(csv.split("\n")[0]).toBe("=Danger");
  });

  it("applies protection across page, hidden-column, header and delimiter scopes", () => {
    const data = [
      { visible: "=1+1", hidden: "@SUM(A1:A5)" },
      { visible: "+SUM(A1:A5)", hidden: "=2+2" }
    ];
    const columns: TableColumnConfig[] = [
      { field: "visible", label: "Visible" },
      { field: "hidden", label: "Hidden", visible: false }
    ];

    expect(exportTable(data, columns)).toContain("'=1+1");
    expect(exportTable(data, columns)).toContain("'+SUM(A1:A5)");
    expect(exportTable(data, columns, { includeHidden: true })).toContain("'@SUM(A1:A5)");
    expect(exportTable(data, columns, { includeHidden: true, includeHeaders: false })).not.toContain(
      "Visible"
    );
    const paged = createTable({ data, columns, pagination: true, pageSize: 1 });
    expect(
      paged.toCSV({ scope: "page", delimiter: ";", includeHeaders: false, includeHidden: true })
    ).toBe("'=1+1;'@SUM(A1:A5)");
    paged.destroy();
    expect(exportTable(data, columns, { bom: true }).startsWith("\uFEFF")).toBe(true);
  });

  it("leaves JSON and HTML exports unchanged and does not mutate data", () => {
    const row = { value: "=1+1" };
    const table = createTable({
      data: [row],
      columns: [{ field: "value", label: "Value" }]
    });
    expect(table.toCSV({ includeHeaders: false })).toBe("'=1+1");
    expect(table.toJSON()).toBe('[{"value":"=1+1"}]');
    expect(table.toHTML()).toContain("=1+1");
    expect(table.toHTML()).not.toContain("'=1+1");
    expect(row.value).toBe("=1+1");
    table.destroy();
  });
});
