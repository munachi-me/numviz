import type { NormalizedRow, ResolvedSeries } from "../../types.js";

/** Numeric values for a series across all rows, skipping non-numeric cells. */
export function seriesValues(rows: readonly NormalizedRow[], series: ResolvedSeries): number[] {
  const values: number[] = [];
  for (const row of rows) {
    const value = row.values[series.field];
    if (typeof value === "number" && Number.isFinite(value)) values.push(value);
  }
  return values;
}

export interface StackRange {
  readonly y0: number;
  readonly y1: number;
  readonly value: number;
}

/** Stack series values per category, with positive and negative stacks separate. */
export function stackSeries(
  rows: readonly NormalizedRow[],
  seriesList: readonly ResolvedSeries[]
): Map<string, (StackRange | null)[]> {
  const result = new Map<string, (StackRange | null)[]>();
  for (const series of seriesList) {
    result.set(series.field, []);
  }

  rows.forEach((row, rowIndex) => {
    let positive = 0;
    let negative = 0;
    for (const series of seriesList) {
      const raw = row.values[series.field];
      const value = typeof raw === "number" && Number.isFinite(raw) ? raw : null;
      const bucket = result.get(series.field);
      if (!bucket) continue;
      if (value === null) {
        bucket[rowIndex] = null;
        continue;
      }
      if (value >= 0) {
        bucket[rowIndex] = { y0: positive, y1: positive + value, value };
        positive += value;
      } else {
        bucket[rowIndex] = { y0: negative, y1: negative + value, value };
        negative += value;
      }
    }
  });

  return result;
}
