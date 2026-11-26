import { NumvizError } from "../errors.js";
import type {
  ColumnDefinition,
  ColumnInput,
  ColumnType,
  DataInput,
  DataMatrixRow,
  DataRecord,
  DatasetLike,
  NormalizedColumn,
  NormalizedDataset,
  NormalizedRow,
  NormalizedValue
} from "../types.js";

const NUMERIC_PATTERN = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}(?:[T ][\d:.]+(?:Z|[+-]\d{2}:?\d{2})?)?$/;

interface RawRecord {
  readonly source: DataRecord | DataMatrixRow;
  readonly values: Record<string, unknown>;
}

function isRecord(value: unknown): value is DataRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDatasetLike(value: unknown): value is DatasetLike {
  return (
    isRecord(value) &&
    (Array.isArray((value as DatasetLike).rows) || Array.isArray((value as DatasetLike).data))
  );
}

function invalidData(message: string, details?: Record<string, unknown>): NumvizError {
  return new NumvizError(message, { code: "INVALID_DATA", details });
}

function isMissing(value: unknown): boolean {
  return value === null || value === undefined || (typeof value === "string" && value.trim() === "");
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && NUMERIC_PATTERN.test(value.trim())) {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function isIsoDateString(value: string): boolean {
  return ISO_DATE_PATTERN.test(value.trim()) && !Number.isNaN(Date.parse(value.trim()));
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : new Date(value.getTime());
  if (typeof value === "string" && isIsoDateString(value)) {
    const parsed = new Date(value.trim());
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function toBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

function inferColumnType(values: readonly unknown[]): ColumnType {
  const present = values.filter((value) => !isMissing(value));
  if (present.length === 0) return "string";
  const numericCount = present.filter((value) => toNumber(value) !== null).length;
  // Allow a minority of invalid entries in an otherwise numeric column.
  if (numericCount > 0 && numericCount * 3 >= present.length * 2) return "number";
  if (
    present.every(
      (value) => value instanceof Date || (typeof value === "string" && isIsoDateString(value))
    )
  ) {
    return "date";
  }
  if (present.every((value) => toBoolean(value) !== null)) return "boolean";
  return "string";
}

function convertValue(value: unknown, type: ColumnType): NormalizedValue {
  if (isMissing(value)) return null;
  switch (type) {
    case "number":
      return toNumber(value);
    case "date":
      return toDate(value);
    case "boolean":
      return toBoolean(value);
    case "string":
      if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
      return String(value);
  }
}

function parseColumnDefinitions(columns: readonly ColumnInput[] | undefined): ColumnDefinition[] {
  if (!columns) return [];
  return columns.map((column, index) => {
    if (typeof column === "string") {
      if (column.trim() === "") {
        throw new NumvizError("Column keys must be non-empty strings.", {
          code: "INVALID_CONFIG",
          path: `columns[${index}]`
        });
      }
      return { key: column };
    }
    if (
      !isRecord(column) ||
      typeof (column as ColumnDefinition).key !== "string" ||
      (column as ColumnDefinition).key.trim() === ""
    ) {
      throw new NumvizError(
        "Each column definition must be a string or an object with a non-empty `key`.",
        { code: "INVALID_CONFIG", path: `columns[${index}]` }
      );
    }
    const definition = column as ColumnDefinition;
    return { ...definition, key: definition.key.trim() };
  });
}

function extractRecords(
  input: DataInput,
  providedColumns: readonly ColumnInput[] | undefined
): { records: RawRecord[]; definitions: ColumnDefinition[]; keys: string[] } {
  if (Array.isArray(input)) {
    const rows = input as readonly unknown[];
    const definitions = parseColumnDefinitions(providedColumns);
    const first = rows[0];

    if (first === undefined) {
      return { records: [], definitions, keys: definitions.map((column) => column.key) };
    }

    if (Array.isArray(first)) {
      if (definitions.length === 0) {
        throw invalidData(
          'Array-of-arrays data requires column definitions. Pass `columns` with a key for each column, for example `columns: ["month", "revenue"]`.',
          { rows: rows.length }
        );
      }
      const keys = definitions.map((column) => column.key);
      const records = rows.map((row, index) => {
        if (!Array.isArray(row)) {
          throw invalidData(`Row ${index} must be an array when column definitions are used.`, {
            row: index
          });
        }
        const values: Record<string, unknown> = {};
        keys.forEach((key, columnIndex) => {
          values[key] = (row as DataMatrixRow)[columnIndex];
        });
        return { source: row as DataMatrixRow, values };
      });
      return { records, definitions, keys };
    }

    const keys: string[] = [];
    const records = rows.map((row, index) => {
      if (!isRecord(row)) {
        throw invalidData(`Row ${index} must be an object or an array.`, { row: index });
      }
      const values: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(row)) {
        if (!keys.includes(key)) keys.push(key);
        values[key] = value;
      }
      return { source: row, values };
    });
    const definitionsWithDefaults = definitions.length > 0 ? definitions : keys.map((key) => ({ key }));
    return { records, definitions: definitionsWithDefaults, keys };
  }

  if (isDatasetLike(input)) {
    const dataset = input as DatasetLike;
    const definitions = parseColumnDefinitions(providedColumns ?? dataset.columns);
    const rows: readonly unknown[] = Array.isArray(dataset.rows)
      ? dataset.rows
      : (dataset.data as readonly DataRecord[]);
    return extractRecords(rows as DataInput, definitions);
  }

  throw invalidData(
    "Chart data must be an array of records, an array of arrays with column definitions, or a Numiq-like dataset."
  );
}

/**
 * Normalize supported input shapes into read-only columns and rows.
 * The source data is never mutated.
 */
export function normalizeData(
  input: DataInput,
  providedColumns?: readonly ColumnInput[]
): NormalizedDataset {
  if (input === null || input === undefined) {
    throw invalidData("Chart data is required.");
  }

  const { records, definitions, keys } = extractRecords(input, providedColumns);
  const allKeys = keys.length > 0 ? keys : definitions.map((column) => column.key);

  const seenKeys = new Set<string>();
  for (const key of allKeys) {
    if (seenKeys.has(key)) {
      throw new NumvizError(`Duplicate column key "${key}". Provide unique column keys.`, {
        code: "INVALID_CONFIG",
        path: "columns"
      });
    }
    seenKeys.add(key);
  }

  const columns: NormalizedColumn[] = allKeys.map((key) => {
    const definition = definitions.find((column) => column.key === key);
    const rawValues = records.map((record) => record.values[key]);
    const type = definition?.type ?? inferColumnType(rawValues);
    return { key, label: definition?.label ?? key, type };
  });

  const rows: NormalizedRow[] = records.map((record, index) => {
    const values: Record<string, NormalizedValue> = {};
    for (const column of columns) {
      values[column.key] = convertValue(record.values[column.key], column.type);
    }
    return { index, values, source: record.source };
  });

  return { columns, rows, source: input, empty: rows.length === 0 };
}
