import { NumvizError } from "../errors.js";
import type { NormalizedRow, NormalizedValue } from "../types.js";
import type {
  MetricAggregation,
  MetricAggregationName,
  MetricContext,
  MetricFilter,
  MetricRowContext
} from "./types.js";

const BUILT_INS: readonly MetricAggregationName[] = [
  "sum",
  "average",
  "count",
  "distinct-count",
  "minimum",
  "maximum",
  "median",
  "percentage",
  "custom"
];

const ALIASES: Readonly<Record<string, MetricAggregationName>> = {
  sum: "sum",
  average: "average",
  avg: "average",
  mean: "average",
  count: "count",
  "distinct-count": "distinct-count",
  distinct: "distinct-count",
  distinctcount: "distinct-count",
  minimum: "minimum",
  min: "minimum",
  maximum: "maximum",
  max: "maximum",
  median: "median",
  percentage: "percentage",
  percent: "percentage"
};

/** Resolve an aggregation name or custom function. */
export function parseAggregation(
  value: unknown,
  path: string
): { aggregation: MetricAggregation; name: MetricAggregationName } {
  if (typeof value === "function") {
    return { aggregation: value as MetricAggregation, name: "custom" };
  }
  if (typeof value !== "string") {
    throw new NumvizError(`\`${path}\` must be an aggregation name or function.`, {
      code: "INVALID_CONFIG",
      path,
      details: { received: typeof value }
    });
  }
  const name = ALIASES[value.trim().toLowerCase()];
  if (!name) {
    throw new NumvizError(
      `\`${path}\` must be one of: ${BUILT_INS.filter((entry) => entry !== "custom").join(", ")}.`,
      { code: "INVALID_CONFIG", path, details: { received: value } }
    );
  }
  return { aggregation: name, name };
}

/** True when the aggregation needs a numeric/column source. */
export function aggregationNeedsColumn(name: MetricAggregationName): boolean {
  return (
    name === "sum" ||
    name === "average" ||
    name === "distinct-count" ||
    name === "minimum" ||
    name === "maximum" ||
    name === "median"
  );
}

/** Apply a filter callback or object to one normalized row. */
export function matchesFilter(row: NormalizedRow, filter?: MetricFilter): boolean {
  if (!filter) return true;
  if (typeof filter === "function") {
    const context: MetricRowContext = {
      index: row.index,
      values: row.values,
      row: row.source
    };
    return filter(context);
  }
  return Object.entries(filter).every(([key, expected]) =>
    normalizedEquals(row.values[key], expected)
  );
}

function normalizedEquals(actual: NormalizedValue | undefined, expected: unknown): boolean {
  if (actual instanceof Date && expected instanceof Date) {
    return actual.getTime() === expected.getTime();
  }
  if (actual === null || actual === undefined) return expected === null || expected === undefined;
  return actual === expected;
}

function distinctKey(value: NormalizedValue): string {
  if (value instanceof Date) return `date:${value.getTime()}`;
  return `${typeof value}:${String(value)}`;
}

/** Numeric values for a column, ignoring missing and non-numeric cells. */
export function numericValues(
  rows: readonly NormalizedRow[],
  column: string | undefined
): number[] {
  if (!column) return [];
  const values: number[] = [];
  for (const row of rows) {
    const value = row.values[column];
    if (typeof value === "number" && Number.isFinite(value)) values.push(value);
  }
  return values;
}

/** Apply a metric filter to normalized rows. */
export function filterRows(
  rows: readonly NormalizedRow[],
  filter?: MetricFilter
): NormalizedRow[] {
  return filter ? rows.filter((row) => matchesFilter(row, filter)) : [...rows];
}

interface AggregateInput {
  readonly rows: readonly NormalizedRow[];
  readonly filter?: MetricFilter;
  readonly column?: string;
  readonly totalRowCount: number;
  readonly dataset: MetricContext["dataset"];
}

interface AggregateResult {
  readonly value: number | null;
  readonly validCount: number;
  readonly missingCount: number;
  readonly name: MetricAggregationName;
}

/** Compute a value from rows using a built-in or custom aggregation. */
export function aggregate(
  input: AggregateInput,
  aggregation: MetricAggregation,
  name: MetricAggregationName
): AggregateResult {
  const rows = filterRows(input.rows, input.filter);
  const values = numericValues(rows, input.column);
  const missingCount = input.column ? Math.max(0, rows.length - values.length) : 0;
  const context: MetricContext = {
    rows,
    values,
    column: input.column,
    totalRowCount: input.totalRowCount,
    matchedRowCount: rows.length,
    dataset: input.dataset
  };

  if (name === "custom") {
    if (typeof aggregation !== "function") {
      throw new NumvizError("`aggregation` must be a function for custom aggregation.", {
        code: "INVALID_CONFIG",
        path: "aggregation"
      });
    }
    const result = aggregation(context);
    if (result === null || result === undefined) {
      return { value: null, validCount: values.length, missingCount, name };
    }
    if (typeof result !== "number" || !Number.isFinite(result)) {
      throw new NumvizError("A custom aggregation must return a finite number or null.", {
        code: "INVALID_CONFIG",
        path: "aggregation",
        details: { received: result }
      });
    }
    return { value: result, validCount: values.length, missingCount, name };
  }

  if (name === "count") {
    return { value: rows.length, validCount: rows.length, missingCount: 0, name };
  }

  if (name === "percentage") {
    const value = input.totalRowCount === 0 ? null : rows.length / input.totalRowCount;
    return { value, validCount: rows.length, missingCount: 0, name };
  }

  if (name === "distinct-count") {
    const distinct = new Set<string>();
    let nonNull = 0;
    for (const row of rows) {
      const value = input.column ? row.values[input.column] : undefined;
      if (value !== null && value !== undefined) {
        nonNull += 1;
        distinct.add(distinctKey(value));
      }
    }
    return {
      value: distinct.size,
      validCount: nonNull,
      missingCount: rows.length - nonNull,
      name
    };
  }

  if (values.length === 0) {
    return { value: null, validCount: 0, missingCount, name };
  }

  let value: number;
  switch (name) {
    case "sum":
      value = values.reduce((total, entry) => total + entry, 0);
      break;
    case "average":
      value = values.reduce((total, entry) => total + entry, 0) / values.length;
      break;
    case "minimum":
      value = Math.min(...values);
      break;
    case "maximum":
      value = Math.max(...values);
      break;
    case "median": {
      const sorted = [...values].sort((a, b) => a - b);
      const middle = Math.floor(sorted.length / 2);
      value =
        sorted.length % 2 === 0
          ? ((sorted[middle - 1] as number) + (sorted[middle] as number)) / 2
          : (sorted[middle] as number);
      break;
    }
    default:
      value = 0;
  }
  if (!Number.isFinite(value)) {
    return { value: null, validCount: values.length, missingCount, name };
  }
  return { value, validCount: values.length, missingCount, name };
}
