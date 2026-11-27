import { normalizeData } from "../data/normalize.js";
import { NumvizError } from "../errors.js";
import type {
  ColumnInput,
  DataInput,
  DatasetLike,
  NormalizedDataset,
  NormalizedRow,
  NormalizedValue
} from "../types.js";
import { isPlainObject, requireNonEmptyString } from "../utils/validate.js";
import type {
  DashboardCustomFilter,
  DashboardFilter,
  DashboardFilterOption,
  DashboardFilterRange,
  DashboardFilterRowContext,
  DashboardFilterValue,
  ResolvedDashboardFilter
} from "./types.js";

const FILTER_TYPES = [
  "select",
  "multi-select",
  "search",
  "date-range",
  "number-range",
  "custom"
] as const;

function invalid(message: string, path: string, details?: Record<string, unknown>): NumvizError {
  return new NumvizError(message, { code: "INVALID_CONFIG", path, details });
}

function optionalString(value: unknown, path: string): string | undefined {
  if (value === undefined) return undefined;
  return requireNonEmptyString(value, path);
}

function resolveTargets(value: unknown, path: string): readonly string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    throw invalid(`\`${path}\` must be an array of widget ids.`, path);
  }
  const targets = value.map((entry, index) => requireNonEmptyString(entry, `${path}[${index}]`));
  return [...new Set(targets)];
}

function resolveOptions(
  value: unknown,
  path: string
): readonly DashboardFilterOption[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    throw invalid(`\`${path}\` must be an array of options.`, path);
  }
  return value.map((entry, index) => {
    if (isPlainObject(entry)) {
      const option = entry as unknown as DashboardFilterOption;
      const optionValue = option.value;
      if (
        typeof optionValue !== "string" &&
        typeof optionValue !== "number" &&
        typeof optionValue !== "boolean"
      ) {
        throw invalid(
          `\`${path}[${index}].value\` must be a string, number or boolean.`,
          `${path}[${index}].value`
        );
      }
      return {
        label:
          option.label === undefined
            ? String(optionValue)
            : requireNonEmptyString(option.label, `${path}[${index}].label`),
        value: optionValue
      };
    }
    if (typeof entry === "string" || typeof entry === "number" || typeof entry === "boolean") {
      return { label: String(entry), value: entry };
    }
    throw invalid(
      `\`${path}[${index}]\` must be an option object or a primitive value.`,
      `${path}[${index}]`
    );
  });
}

function resolveFilter(value: unknown, index: number): ResolvedDashboardFilter {
  const path = `filters[${index}]`;
  if (!isPlainObject(value)) {
    throw invalid(`\`${path}\` must be an object.`, path);
  }
  const filter = value as unknown as DashboardFilter;
  const id = requireNonEmptyString(filter.id, `${path}.id`);
  const type = filter.type;
  if (!FILTER_TYPES.includes(type)) {
    throw invalid(`\`${path}.type\` must be one of: ${FILTER_TYPES.join(", ")}.`, `${path}.type`, {
      received: type
    });
  }
  const field = optionalString(filter.field, `${path}.field`);
  if (field === undefined && type !== "search" && type !== "custom") {
    throw invalid(`\`${path}.field\` is required for ${type} filters.`, `${path}.field`);
  }
  const label = filter.label === undefined ? id : requireNonEmptyString(filter.label, `${path}.label`);
  const placeholder = optionalString(filter.placeholder, `${path}.placeholder`);
  const className = optionalString(filter.className, `${path}.className`);
  const targets = resolveTargets(filter.targets, `${path}.targets`);
  const defaultValue = filter.defaultValue ?? null;

  if (filter.type === "select" || filter.type === "multi-select") {
    const multi = filter.type === "multi-select" || filter.multi === true;
    return {
      id,
      type: multi ? "multi-select" : "select",
      ...(field !== undefined ? { field } : {}),
      label,
      ...(placeholder !== undefined ? { placeholder } : {}),
      ...(targets !== undefined ? { targets } : {}),
      defaultValue,
      ...(className !== undefined ? { className } : {}),
      options: resolveOptions(filter.options, `${path}.options`),
      multi
    };
  }

  if (filter.type === "search") {
    return {
      id,
      type,
      ...(field !== undefined ? { field } : {}),
      label,
      ...(placeholder !== undefined ? { placeholder } : {}),
      ...(targets !== undefined ? { targets } : {}),
      defaultValue,
      ...(className !== undefined ? { className } : {}),
      options: [],
      multi: false
    };
  }

  if (filter.type === "date-range") {
    const min = optionalString(filter.min, `${path}.min`);
    const max = optionalString(filter.max, `${path}.max`);
    return {
      id,
      type,
      ...(field !== undefined ? { field } : {}),
      label,
      ...(placeholder !== undefined ? { placeholder } : {}),
      ...(targets !== undefined ? { targets } : {}),
      defaultValue,
      ...(className !== undefined ? { className } : {}),
      options: [],
      multi: false,
      ...(min !== undefined ? { min } : {}),
      ...(max !== undefined ? { max } : {})
    };
  }

  if (filter.type === "number-range") {
    for (const key of ["min", "max", "step"] as const) {
      const number = filter[key];
      if (number !== undefined && (typeof number !== "number" || !Number.isFinite(number))) {
        throw invalid(`\`${path}.${key}\` must be a finite number.`, `${path}.${key}`);
      }
    }
    return {
      id,
      type,
      ...(field !== undefined ? { field } : {}),
      label,
      ...(placeholder !== undefined ? { placeholder } : {}),
      ...(targets !== undefined ? { targets } : {}),
      defaultValue,
      ...(className !== undefined ? { className } : {}),
      options: [],
      multi: false,
      ...(filter.min !== undefined ? { min: filter.min } : {}),
      ...(filter.max !== undefined ? { max: filter.max } : {}),
      ...(filter.step !== undefined ? { step: filter.step } : {})
    };
  }

  const custom = filter as DashboardCustomFilter;
  if (typeof custom.render !== "function") {
    throw invalid("`filters.custom.render` must be a function.", `${path}.render`);
  }
  if (custom.matches !== undefined && typeof custom.matches !== "function") {
    throw invalid("`filters.custom.matches` must be a function.", `${path}.matches`);
  }
  return {
    id,
    type,
    ...(field !== undefined ? { field } : {}),
    label,
    ...(placeholder !== undefined ? { placeholder } : {}),
    ...(targets !== undefined ? { targets } : {}),
    defaultValue,
    ...(className !== undefined ? { className } : {}),
    options: [],
    multi: false,
    render: custom.render,
    ...(custom.matches !== undefined ? { matches: custom.matches } : {})
  };
}

/** Validate dashboard filters and normalize their options. */
export function resolveFilters(value: readonly DashboardFilter[] | undefined): readonly ResolvedDashboardFilter[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    throw invalid("`filters` must be an array.", "filters");
  }
  const filters = value.map((filter, index) => resolveFilter(filter, index));
  const ids = new Set<string>();
  for (const filter of filters) {
    if (ids.has(filter.id)) {
      throw invalid(`Duplicate dashboard filter id "${filter.id}".`, "filters", {
        id: filter.id
      });
    }
    ids.add(filter.id);
  }
  return filters;
}

function isRange(value: DashboardFilterValue): value is DashboardFilterRange {
  return isPlainObject(value) && ("from" in value || "to" in value);
}

/** True when a filter value should affect rows. */
export function isFilterActive(value: DashboardFilterValue | undefined): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 0;
  if (isRange(value)) {
    return (
      (value.from !== undefined && value.from !== null && String(value.from).trim() !== "") ||
      (value.to !== undefined && value.to !== null && String(value.to).trim() !== "")
    );
  }
  return true;
}

function comparable(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function looseEqual(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (left === null || left === undefined || right === null || right === undefined) return false;
  return comparable(left) === comparable(right);
}

function asTimestamp(value: unknown): number | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.getTime();
  }
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function matchesValue(
  filter: ResolvedDashboardFilter,
  value: DashboardFilterValue,
  raw: NormalizedValue
): boolean {
  if (filter.type === "search") {
    const query = String(value).trim().toLowerCase();
    return raw !== null && comparable(raw).toLowerCase().includes(query);
  }
  if (filter.type === "select" || filter.type === "multi-select") {
    const selected = Array.isArray(value) ? value : [value];
    return selected.some((entry) => looseEqual(raw, entry));
  }
  if (filter.type === "date-range") {
    const range = isRange(value) ? value : {};
    const timestamp = asTimestamp(raw);
    if (timestamp === null) return false;
    const from = asTimestamp(range.from);
    const to = asTimestamp(range.to);
    return (from === null || timestamp >= from) && (to === null || timestamp <= to);
  }
  if (filter.type === "number-range") {
    const range = isRange(value) ? value : {};
    const number = asNumber(raw);
    if (number === null) return false;
    const from = asNumber(range.from);
    const to = asNumber(range.to);
    return (from === null || number >= from) && (to === null || number <= to);
  }
  return true;
}

function rowMatches(
  filter: ResolvedDashboardFilter,
  value: DashboardFilterValue,
  row: NormalizedRow,
  componentId: string
): boolean {
  if (!isFilterActive(value)) return true;
  if (filter.targets !== undefined && !filter.targets.includes(componentId)) return true;
  if (filter.source !== undefined && filter.source === componentId && filter.includeSelf !== true) {
    return true;
  }
  if (filter.type === "custom") {
    if (!filter.matches) return true;
    const context: DashboardFilterRowContext = {
      id: filter.id,
      values: row.values,
      row
    };
    return filter.matches(context, value);
  }
  if (filter.field === undefined) {
    return Object.values(row.values).some((raw) => matchesValue(filter, value, raw));
  }
  if (!(filter.field in row.values)) return true;
  return matchesValue(filter, value, row.values[filter.field] ?? null);
}

function normalizeForFilter(
  input: DataInput,
  columns: readonly ColumnInput[] | undefined
): NormalizedDataset {
  return normalizeData(input, columns);
}

function filteredSources(
  dataset: NormalizedDataset,
  filters: readonly ResolvedDashboardFilter[],
  values: ReadonlyMap<string, DashboardFilterValue>,
  componentId: string
): readonly (NormalizedRow["source"])[] {
  return dataset.rows
    .filter((row) =>
      filters.every((filter) => rowMatches(filter, values.get(filter.id) ?? null, row, componentId))
    )
    .map((row) => row.source);
}

/**
 * Apply dashboard filters to a component dataset while preserving the input
 * shape. Components without a matching field are left untouched.
 */
export function filterDataInput(
  input: DataInput,
  columns: readonly ColumnInput[] | undefined,
  filters: readonly ResolvedDashboardFilter[],
  values: ReadonlyMap<string, DashboardFilterValue>,
  componentId: string
): DataInput {
  if (filters.length === 0 || !filters.some((filter) => isFilterActive(values.get(filter.id)))) {
    return input;
  }
  const dataset = normalizeForFilter(input, columns);
  const sources = filteredSources(dataset, filters, values, componentId);
  if (Array.isArray(input)) return sources as DataInput;
  if (isPlainObject(input) && ("rows" in input || "data" in input)) {
    return { ...(input as DatasetLike), rows: sources } as DataInput;
  }
  return input;
}

/** Collect unique values for an automatically populated select filter. */
export function collectFilterOptions(
  datasets: readonly { readonly data: DataInput; readonly columns?: readonly ColumnInput[] }[],
  field: string
): readonly DashboardFilterOption[] {
  const seen = new Map<string, DashboardFilterOption>();
  for (const entry of datasets) {
    let dataset: NormalizedDataset;
    try {
      dataset = normalizeData(entry.data, entry.columns);
    } catch {
      continue;
    }
    for (const row of dataset.rows) {
      const value = row.values[field];
      if (value === null || value === undefined) continue;
      const key = comparable(value);
      if (!seen.has(key)) {
        const optionValue =
          typeof value === "string" || typeof value === "number" || typeof value === "boolean"
            ? value
            : comparable(value);
        seen.set(key, { label: comparable(value), value: optionValue });
      }
    }
  }
  return [...seen.values()].sort((left, right) => left.label.localeCompare(right.label));
}
