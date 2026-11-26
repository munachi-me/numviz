import { normalizeData } from "../data/normalize.js";
import { NumvizError } from "../errors.js";
import { resolveThemeConfig } from "../theme/validate.js";
import type { ColumnDefinition, ColumnType } from "../types.js";
import {
  isPlainObject,
  requireBoolean,
  requireCallback,
  requireNonEmptyString
} from "../utils/validate.js";
import type {
  ResolvedTableColumn,
  ResolvedTableConfig,
  TableAlign,
  TableColumnConfig,
  TableConfig,
  TableData,
  TableFormatPreset,
  TableRow,
  TableSortDirection,
  TableSortState,
  TableVariant
} from "./types.js";

const VARIANTS: readonly TableVariant[] = [
  "minimal",
  "striped",
  "bordered",
  "compact",
  "dashboard"
];
const ALIGNMENTS: readonly TableAlign[] = ["left", "center", "right"];
const SORT_DIRECTIONS: readonly TableSortDirection[] = ["asc", "desc"];
const FORMATS: readonly TableFormatPreset[] = [
  "text",
  "number",
  "currency",
  "percent",
  "date"
];

const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_PAGE_SIZE_OPTIONS: readonly number[] = [10, 25, 50, 100];

interface ParsedColumn {
  readonly field?: string;
  readonly label?: string;
  readonly type?: ColumnType;
  readonly visible: boolean;
  readonly width?: string;
  readonly align?: TableAlign;
  readonly format?: TableFormatPreset | TableColumnConfig["format"];
  readonly formatOptions?: Intl.NumberFormatOptions | Intl.DateTimeFormatOptions;
  readonly currency?: string;
  readonly render?: TableColumnConfig["render"];
  readonly value?: TableColumnConfig["value"];
  readonly sortable?: boolean;
  readonly searchable?: boolean;
  readonly className?: string;
  readonly headerClassName?: string;
}

function parseWidth(value: unknown, path: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value <= 0) {
      throw new NumvizError(`\`${path}\` must be a positive number or CSS length.`, {
        code: "INVALID_CONFIG",
        path,
        details: { received: value }
      });
    }
    return `${value}px`;
  }
  return requireNonEmptyString(value, path);
}

function parseColumn(entry: string | TableColumnConfig, index: number): ParsedColumn {
  const path = `columns[${index}]`;
  if (typeof entry === "string") {
    return { field: requireNonEmptyString(entry, path).trim(), visible: true };
  }
  if (!isPlainObject(entry)) {
    throw new NumvizError("Each table column must be a field name or a column object.", {
      code: "INVALID_CONFIG",
      path
    });
  }
  const column = entry as TableColumnConfig;
  const rawField = column.field ?? column.key;
  if (rawField !== undefined) requireNonEmptyString(rawField, `${path}.field`);
  if (column.type !== undefined && !["string", "number", "date", "boolean"].includes(column.type)) {
    throw new NumvizError("`type` must be one of: string, number, date, boolean.", {
      code: "INVALID_CONFIG",
      path: `${path}.type`,
      details: { received: column.type }
    });
  }
  if (column.visible !== undefined) requireBoolean(column.visible, `${path}.visible`);
  if (column.align !== undefined && !ALIGNMENTS.includes(column.align)) {
    throw new NumvizError(`\`align\` must be one of: ${ALIGNMENTS.join(", ")}.`, {
      code: "INVALID_CONFIG",
      path: `${path}.align`,
      details: { received: column.align }
    });
  }
  if (column.currency !== undefined) requireNonEmptyString(column.currency, `${path}.currency`);
  if (column.render !== undefined) requireCallback(column.render, `${path}.render`);
  if (column.value !== undefined) requireCallback(column.value, `${path}.value`);
  if (column.sortable !== undefined) requireBoolean(column.sortable, `${path}.sortable`);
  if (column.searchable !== undefined) requireBoolean(column.searchable, `${path}.searchable`);
  if (column.className !== undefined) requireNonEmptyString(column.className, `${path}.className`);
  if (column.headerClassName !== undefined) {
    requireNonEmptyString(column.headerClassName, `${path}.headerClassName`);
  }
  if (column.formatOptions !== undefined && !isPlainObject(column.formatOptions)) {
    throw new NumvizError("`formatOptions` must be an object.", {
      code: "INVALID_CONFIG",
      path: `${path}.formatOptions`
    });
  }
  if (
    column.format !== undefined &&
    typeof column.format !== "function" &&
    !FORMATS.includes(column.format)
  ) {
    throw new NumvizError(
      `\`format\` must be a preset or a function. Presets: ${FORMATS.join(", ")}.`,
      { code: "INVALID_CONFIG", path: `${path}.format`, details: { received: column.format } }
    );
  }
  return {
    ...(rawField !== undefined ? { field: rawField.trim() } : {}),
    ...(column.label !== undefined
      ? { label: requireNonEmptyString(column.label, `${path}.label`) }
      : {}),
    ...(column.type !== undefined ? { type: column.type } : {}),
    visible: column.visible ?? true,
    ...(column.width !== undefined ? { width: parseWidth(column.width, `${path}.width`) } : {}),
    ...(column.align !== undefined ? { align: column.align } : {}),
    ...(column.format !== undefined ? { format: column.format } : {}),
    ...(column.formatOptions !== undefined ? { formatOptions: column.formatOptions } : {}),
    ...(column.currency !== undefined ? { currency: column.currency } : {}),
    ...(column.render !== undefined ? { render: column.render } : {}),
    ...(column.value !== undefined ? { value: column.value } : {}),
    ...(column.sortable !== undefined ? { sortable: column.sortable } : {}),
    ...(column.searchable !== undefined ? { searchable: column.searchable } : {}),
    ...(column.className !== undefined ? { className: column.className } : {}),
    ...(column.headerClassName !== undefined
      ? { headerClassName: column.headerClassName }
      : {})
  };
}

function defaultAlign(type: ColumnType): TableAlign {
  return type === "number" ? "right" : "left";
}

function defaultFormat(type: ColumnType): TableFormatPreset | undefined {
  if (type === "number") return "number";
  if (type === "date") return "date";
  return undefined;
}

function resolveColumn(
  parsed: ParsedColumn,
  index: number,
  normalizedType: ColumnType | undefined,
  normalizedLabel: string | undefined,
  globalSortable: boolean,
  computed: boolean
): ResolvedTableColumn {
  const type = parsed.type ?? normalizedType ?? "string";
  const canSort = !computed || parsed.value !== undefined;
  const preset = parsed.format ?? defaultFormat(type);
  return {
    index,
    field: parsed.field ?? `__numviz_computed_${index}`,
    label: parsed.label ?? normalizedLabel ?? parsed.field ?? `Column ${index + 1}`,
    type,
    visible: parsed.visible,
    ...(parsed.width !== undefined ? { width: parsed.width } : {}),
    align: parsed.align ?? defaultAlign(type),
    ...(preset !== undefined ? { format: preset } : {}),
    ...(parsed.formatOptions !== undefined ? { formatOptions: parsed.formatOptions } : {}),
    ...(parsed.currency !== undefined ? { currency: parsed.currency } : {}),
    ...(parsed.render !== undefined ? { render: parsed.render } : {}),
    ...(parsed.value !== undefined ? { value: parsed.value } : {}),
    sortable: parsed.sortable ?? (globalSortable && canSort),
    searchable: parsed.searchable ?? canSort,
    ...(parsed.className !== undefined ? { className: parsed.className } : {}),
    ...(parsed.headerClassName !== undefined ? { headerClassName: parsed.headerClassName } : {})
  };
}

function parseDirection(value: unknown, path: string): TableSortDirection {
  if (!SORT_DIRECTIONS.includes(value as TableSortDirection)) {
    throw new NumvizError(`\`${path}\` must be "asc" or "desc".`, {
      code: "INVALID_CONFIG",
      path,
      details: { received: value }
    });
  }
  return value as TableSortDirection;
}

/** Validate a table configuration and normalize its data. */
export function resolveTable(config: TableConfig): {
  config: ResolvedTableConfig;
  data: TableData;
} {
  if (!isPlainObject(config)) {
    throw new NumvizError("`createTable` requires a configuration object.", {
      code: "INVALID_CONFIG"
    });
  }
  if (config.data === undefined || config.data === null) {
    throw new NumvizError("`data` is required.", { code: "INVALID_CONFIG", path: "data" });
  }
  for (const flag of [
    "sortable",
    "searchable",
    "pagination",
    "rowNumbers",
    "selectable",
    "striped",
    "stickyHeader",
    "responsive",
    "loading"
  ] as const) {
    if (config[flag] !== undefined) requireBoolean(config[flag], flag);
  }
  if (config.onSortChange !== undefined) requireCallback(config.onSortChange, "onSortChange");
  if (config.onSearchChange !== undefined) {
    requireCallback(config.onSearchChange, "onSearchChange");
  }
  if (config.onPageChange !== undefined) requireCallback(config.onPageChange, "onPageChange");
  if (config.onSelectionChange !== undefined) {
    requireCallback(config.onSelectionChange, "onSelectionChange");
  }
  for (const [path, value] of [
    ["searchPlaceholder", config.searchPlaceholder],
    ["loadingMessage", config.loadingMessage],
    ["emptyMessage", config.emptyMessage],
    ["noResultsMessage", config.noResultsMessage],
    ["className", config.className],
    ["title", config.title],
    ["caption", config.caption],
    ["ariaLabel", config.ariaLabel]
  ] as const) {
    if (value !== undefined) requireNonEmptyString(value, path);
  }
  if (config.error !== undefined && config.error !== null) {
    requireNonEmptyString(config.error, "error");
  }
  if (config.variant !== undefined && !VARIANTS.includes(config.variant)) {
    throw new NumvizError(`\`variant\` must be one of: ${VARIANTS.join(", ")}.`, {
      code: "INVALID_CONFIG",
      path: "variant",
      details: { received: config.variant }
    });
  }
  const locale =
    config.locale === undefined ? "en-US" : requireNonEmptyString(config.locale, "locale");
  const theme = resolveThemeConfig(config.theme);
  const maxHeight =
    config.maxHeight === undefined
      ? undefined
      : typeof config.maxHeight === "number"
        ? parseWidth(config.maxHeight, "maxHeight")
        : requireNonEmptyString(config.maxHeight, "maxHeight");
  if (
    config.pageSize !== undefined &&
    (typeof config.pageSize !== "number" ||
      !Number.isInteger(config.pageSize) ||
      config.pageSize <= 0)
  ) {
    throw new NumvizError("`pageSize` must be a positive integer.", {
      code: "INVALID_CONFIG",
      path: "pageSize",
      details: { received: config.pageSize }
    });
  }
  const pageSize = config.pageSize ?? DEFAULT_PAGE_SIZE;
  let pageSizeOptions: number[];
  if (config.pageSizeOptions === undefined) {
    pageSizeOptions = [...DEFAULT_PAGE_SIZE_OPTIONS];
  } else {
    if (!Array.isArray(config.pageSizeOptions) || config.pageSizeOptions.length === 0) {
      throw new NumvizError("`pageSizeOptions` must be a non-empty array of page sizes.", {
        code: "INVALID_CONFIG",
        path: "pageSizeOptions"
      });
    }
    pageSizeOptions = config.pageSizeOptions.map((value, index) => {
      if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
        throw new NumvizError("Page sizes must be positive integers.", {
          code: "INVALID_CONFIG",
          path: `pageSizeOptions[${index}]`,
          details: { received: value }
        });
      }
      return value;
    });
  }
  pageSizeOptions = [...new Set([...pageSizeOptions, pageSize])].sort((a, b) => a - b);

  const globalSortable = config.sortable ?? true;
  const rawColumns = config.columns;
  if (rawColumns !== undefined && !Array.isArray(rawColumns)) {
    throw new NumvizError("`columns` must be an array of field names or column objects.", {
      code: "INVALID_CONFIG",
      path: "columns"
    });
  }

  const parsedColumns = (rawColumns ?? []).map(parseColumn);
  const dataColumns = parsedColumns.filter(
    (column): column is ParsedColumn & { field: string } => column.field !== undefined
  );
  // Display columns may reuse a field (for example a formatted and a raw view).
  // Normalization definitions must stay unique.
  const seenFields = new Set<string>();
  const definitions: ColumnDefinition[] = [];
  for (const column of dataColumns) {
    if (seenFields.has(column.field)) continue;
    seenFields.add(column.field);
    definitions.push({
      key: column.field,
      ...(column.label !== undefined ? { label: column.label } : {}),
      ...(column.type !== undefined ? { type: column.type } : {})
    });
  }
  const normalized = normalizeData(
    config.data,
    definitions.length > 0 ? definitions : undefined
  );

  const rows: TableRow[] = normalized.rows.map((row) => {
    const base: Record<string, unknown> = isPlainObject(row.source) ? { ...row.source } : {};
    for (const [key, value] of Object.entries(row.values)) base[key] = value;
    return base;
  });

  let columns: ResolvedTableColumn[];
  if (parsedColumns.length === 0) {
    columns = normalized.columns.map((column, index) =>
      resolveColumn(
        { field: column.key, visible: true },
        index,
        column.type,
        column.label,
        globalSortable,
        false
      )
    );
  } else {
    columns = parsedColumns.map((parsed, index) => {
      const normalizedColumn = parsed.field
        ? normalized.columns.find((column) => column.key === parsed.field)
        : undefined;
      return resolveColumn(
        parsed,
        index,
        normalizedColumn?.type,
        normalizedColumn?.label,
        globalSortable,
        parsed.field === undefined
      );
    });
  }

  const defaultSort = resolveDefaultSort(config.defaultSort, columns);
  const selectedRows = resolveSelection(config.selectedRows, rows.length);

  const resolved: ResolvedTableConfig = {
    columns,
    defaultSort,
    selectedRows,
    sortable: globalSortable,
    searchable: config.searchable ?? false,
    searchPlaceholder: config.searchPlaceholder ?? "Search…",
    pagination: config.pagination ?? false,
    pageSize,
    pageSizeOptions,
    rowNumbers: config.rowNumbers ?? false,
    selectable: config.selectable ?? false,
    loading: config.loading ?? false,
    loadingMessage: config.loadingMessage ?? "Loading…",
    error: config.error ?? null,
    emptyMessage: config.emptyMessage ?? "No data to display",
    noResultsMessage: config.noResultsMessage ?? "No matching rows",
    striped: config.striped ?? false,
    stickyHeader: config.stickyHeader ?? true,
    ...(maxHeight !== undefined ? { maxHeight } : {}),
    variant: config.variant ?? "minimal",
    locale,
    theme,
    ...(config.className !== undefined ? { className: config.className } : {}),
    ...(config.title !== undefined ? { title: config.title } : {}),
    ...(config.caption !== undefined ? { caption: config.caption } : {}),
    ...(config.ariaLabel !== undefined ? { ariaLabel: config.ariaLabel } : {}),
    responsive: config.responsive ?? true,
    ...(config.onSortChange !== undefined ? { onSortChange: config.onSortChange } : {}),
    ...(config.onSearchChange !== undefined ? { onSearchChange: config.onSearchChange } : {}),
    ...(config.onPageChange !== undefined ? { onPageChange: config.onPageChange } : {}),
    ...(config.onSelectionChange !== undefined
      ? { onSelectionChange: config.onSelectionChange }
      : {})
  };

  return { config: resolved, data: { rows, rowCount: rows.length } };
}

function resolveDefaultSort(
  input: TableConfig["defaultSort"],
  columns: readonly ResolvedTableColumn[]
): TableSortState | null {
  if (input === undefined || input === null) return null;
  if (!isPlainObject(input)) {
    throw new NumvizError("`defaultSort` must be an object with a field and optional direction.", {
      code: "INVALID_CONFIG",
      path: "defaultSort"
    });
  }
  const field = requireNonEmptyString(input.field, "defaultSort.field");
  const direction =
    input.direction === undefined
      ? "asc"
      : parseDirection(input.direction, "defaultSort.direction");
  if (!columns.some((column) => column.field === field)) {
    throw new NumvizError(`Unknown default sort field "${field}".`, {
      code: "INVALID_CONFIG",
      path: "defaultSort.field",
      details: { field }
    });
  }
  return { field, direction };
}

function resolveSelection(input: readonly number[] | undefined, rowCount: number): number[] {
  if (input === undefined) return [];
  if (!Array.isArray(input)) {
    throw new NumvizError("`selectedRows` must be an array of row indices.", {
      code: "INVALID_CONFIG",
      path: "selectedRows"
    });
  }
  return input.map((value, index) => {
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
      throw new NumvizError("Selected rows must be non-negative integers.", {
        code: "INVALID_CONFIG",
        path: `selectedRows[${index}]`,
        details: { received: value }
      });
    }
    if (value >= rowCount) {
      throw new NumvizError(`Selected row ${value} is outside the data (${rowCount} rows).`, {
        code: "INVALID_CONFIG",
        path: `selectedRows[${index}]`,
        details: { received: value, rowCount }
      });
    }
    return value;
  });
}
