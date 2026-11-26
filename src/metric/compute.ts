import { normalizeData } from "../data/normalize.js";
import { NumvizError } from "../errors.js";
import type { NormalizedDataset } from "../types.js";
import { aggregate, filterRows } from "./aggregate.js";
import {
  defaultFormatFor,
  formatMetricDifference,
  formatMetricValue
} from "./format.js";
import type { ResolvedMetric } from "./resolve.js";
import type {
  MetricComparisonConfig,
  MetricComparisonResult,
  MetricDirection,
  MetricFormatContext,
  MetricResult,
  MetricState
} from "./types.js";

function requireColumn(
  dataset: NormalizedDataset,
  column: string | undefined,
  path: string
): void {
  if (!column) return;
  if (dataset.rows.length === 0 && dataset.columns.length === 0) return;
  if (!dataset.columns.some((entry) => entry.key === column)) {
    throw new NumvizError(`Unknown column "${column}".`, {
      code: "INVALID_CONFIG",
      path,
      details: { column, columns: dataset.columns.map((entry) => entry.key) }
    });
  }
}

function directionOf(difference: number | null): MetricDirection | null {
  if (difference === null) return null;
  if (difference > 0) return "up";
  if (difference < 0) return "down";
  return "flat";
}

function comparisonResult(
  resolved: ResolvedMetric,
  current: number | null,
  config: MetricComparisonConfig,
  aggregation?: ResolvedMetric["comparison"]
): MetricComparisonResult {
  const comparison = aggregation;
  let value: number | null;
  let rowCount = 0;
  let matchedRowCount = 0;
  let validCount = 0;
  const source: "data" | "value" = config.data === undefined ? "value" : "data";

  if (source === "value") {
    value = config.value ?? null;
    validCount = value === null ? 0 : 1;
  } else {
    if (!comparison) {
      throw new NumvizError("Comparison aggregation is missing.", {
        code: "INVALID_CONFIG",
        path: "comparison"
      });
    }
    const comparisonData = config.data;
    if (comparisonData === undefined) {
      throw new NumvizError("Comparison data is required.", {
        code: "INVALID_DATA",
        path: "comparison.data"
      });
    }
    const dataset = normalizeData(comparisonData, config.columns ?? resolved.config.columns);
    requireColumn(dataset, comparison.column, "comparison.column");
    rowCount = dataset.rows.length;
    matchedRowCount = filterRows(dataset.rows, comparison.filter).length;
    const aggregated = aggregate(
      {
        rows: dataset.rows,
        filter: comparison.filter,
        column: comparison.column,
        totalRowCount: dataset.rows.length,
        dataset
      },
      comparison.aggregation,
      comparison.aggregationName
    );
    value = aggregated.value;
    validCount = aggregated.validCount;
  }

  const difference =
    current !== null && value !== null ? current - value : null;
  const percentageChange =
    difference !== null && value !== null && value !== 0
      ? (difference / Math.abs(value)) * 100
      : null;
  const growth =
    difference !== null && value !== null && value !== 0 ? difference / value : null;
  const direction = directionOf(difference);
  const format =
    comparison?.format ??
    (typeof resolved.config.format === "string"
      ? resolved.config.format
      : defaultFormatFor(resolved.aggregationName));
  const context: MetricFormatContext = {
    name: resolved.config.name,
    aggregation: comparison?.aggregationName ?? resolved.aggregationName,
    column: comparison?.column,
    locale: resolved.config.locale ?? "en-US",
    currency: config.currency ?? resolved.config.currency ?? "USD"
  };
  const formattedValue = formatMetricValue(
    value,
    format,
    context,
    config.formatOptions
  );
  const formattedDifference = formatMetricDifference(
    difference,
    format,
    context,
    config.formatOptions
  );

  return {
    source,
    value,
    formattedValue,
    difference,
    formattedDifference,
    percentageChange,
    growth,
    direction,
    label: config.label ?? "vs previous period",
    rowCount,
    matchedRowCount,
    validCount
  };
}

function stateFor(
  trend: MetricDirection | null,
  positiveDirection: "up" | "down"
): MetricState {
  if (trend === null || trend === "flat") return "neutral";
  return trend === positiveDirection ? "positive" : "negative";
}

/** Compute the metric result without touching the DOM. */
export function computeMetric(resolved: ResolvedMetric): MetricResult {
  const config = resolved.config;
  const dataset = normalizeData(config.data, config.columns);
  requireColumn(dataset, config.column, "column");
  const matchedRowCount = filterRows(dataset.rows, config.filter).length;
  const aggregated = aggregate(
    {
      rows: dataset.rows,
      filter: config.filter,
      column: config.column,
      totalRowCount: dataset.rows.length,
      dataset
    },
    resolved.aggregation,
    resolved.aggregationName
  );
  const locale = config.locale ?? "en-US";
  const currency = config.currency ?? "USD";
  const format = config.format ?? defaultFormatFor(resolved.aggregationName);
  const formatContext: MetricFormatContext = {
    name: config.name,
    aggregation: resolved.aggregationName,
    column: config.column,
    locale,
    currency
  };
  const formattedValue = formatMetricValue(
    aggregated.value,
    format,
    formatContext,
    config.formatOptions
  );

  const comparison =
    resolved.comparison === undefined
      ? null
      : comparisonResult(
          resolved,
          aggregated.value,
          resolved.comparison.config,
          resolved.comparison
        );
  let trend: MetricDirection | null = null;
  if (comparison !== null && comparison.value !== null) {
    if (config.trend === false) trend = null;
    else if (config.trend === "auto" || config.trend === undefined) {
      trend = comparison.direction;
    } else {
      trend = config.trend;
    }
  }
  const state = stateFor(trend, config.positiveDirection ?? "up");

  return {
    name: config.name,
    title: config.title ?? config.name,
    value: aggregated.value,
    formattedValue,
    description: config.description,
    prefix: config.prefix,
    suffix: config.suffix,
    aggregation: resolved.aggregationName,
    column: config.column,
    locale,
    currency,
    rowCount: dataset.rows.length,
    matchedRowCount,
    validCount: aggregated.validCount,
    missingCount: aggregated.missingCount,
    comparison,
    direction: comparison?.direction ?? null,
    trend,
    state,
    metadata: {
      aggregation: resolved.aggregationName,
      column: config.column ?? null,
      dataRowCount: dataset.rows.length,
      filteredRowCount: matchedRowCount,
      validCount: aggregated.validCount,
      missingCount: aggregated.missingCount,
      filter: config.filter === undefined
        ? null
        : typeof config.filter === "function"
          ? "function"
          : "object",
      comparison: comparison === null
        ? null
        : {
            source: comparison.source,
            value: comparison.value,
            difference: comparison.difference,
            percentageChange: comparison.percentageChange,
            growth: comparison.growth,
            rowCount: comparison.rowCount,
            matchedRowCount: comparison.matchedRowCount,
            validCount: comparison.validCount
          }
    }
  };
}
