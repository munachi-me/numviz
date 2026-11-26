import { NumvizError } from "../errors.js";
import { resolveThemeConfig } from "../theme/validate.js";
import { isDomNode } from "../utils/dom.js";
import { isPlainObject, requireNonEmptyString } from "../utils/validate.js";
import {
  aggregationNeedsColumn,
  parseAggregation
} from "./aggregate.js";
import { parseFormat } from "./format.js";
import type {
  MetricAggregation,
  MetricAggregationName,
  MetricComparisonConfig,
  MetricConfig,
  MetricFilter,
  MetricFormat,
  MetricTrend,
  MetricVariant
} from "./types.js";

const VARIANTS: readonly MetricVariant[] = ["default", "compact", "bordered", "highlight"];
const TRENDS: readonly MetricTrend[] = ["auto", "up", "down", "flat", false];
const POSITIVE_DIRECTIONS = ["up", "down"] as const;

export interface ResolvedComparison {
  readonly config: MetricComparisonConfig;
  readonly aggregation: MetricAggregation;
  readonly aggregationName: MetricAggregationName;
  readonly column?: string;
  readonly filter?: MetricFilter;
  readonly format?: MetricFormat;
}

export interface ResolvedMetric {
  readonly config: MetricConfig;
  readonly aggregation: MetricAggregation;
  readonly aggregationName: MetricAggregationName;
  readonly comparison?: ResolvedComparison;
}

function optionalString(value: unknown, path: string): string | undefined {
  return value === undefined ? undefined : requireNonEmptyString(value, path);
}

function parseFilter(value: unknown, path: string): MetricFilter | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "function") return value as MetricFilter;
  if (!isPlainObject(value)) {
    throw new NumvizError(`\`${path}\` must be a function or object.`, {
      code: "INVALID_CONFIG",
      path,
      details: { received: typeof value }
    });
  }
  return { ...value };
}

function parseFormatOptions(
  value: unknown,
  path: string
): Intl.NumberFormatOptions | undefined {
  if (value === undefined) return undefined;
  if (!isPlainObject(value)) {
    throw new NumvizError(`\`${path}\` must be an object.`, {
      code: "INVALID_CONFIG",
      path
    });
  }
  return { ...value };
}

function parseComparison(
  input: MetricComparisonConfig,
  aggregation: MetricAggregation,
  aggregationName: MetricAggregationName,
  column: string | undefined,
  currency: string
): ResolvedComparison {
  if (!isPlainObject(input)) {
    throw new NumvizError("`comparison` must be an object.", {
      code: "INVALID_CONFIG",
      path: "comparison"
    });
  }
  const comparison = input as MetricComparisonConfig;
  const hasValue = "value" in comparison;
  const hasData = comparison.data !== undefined;
  if (hasValue && hasData) {
    throw new NumvizError("`comparison` accepts either `data` or `value`, not both.", {
      code: "INVALID_CONFIG",
      path: "comparison"
    });
  }
  if (!hasValue && !hasData) {
    throw new NumvizError("`comparison` requires `data` or `value`.", {
      code: "INVALID_CONFIG",
      path: "comparison"
    });
  }
  if (hasValue && comparison.value !== null && comparison.value !== undefined) {
    if (
      typeof comparison.value !== "number" ||
      !Number.isFinite(comparison.value)
    ) {
      throw new NumvizError("`comparison.value` must be a finite number or null.", {
        code: "INVALID_CONFIG",
        path: "comparison.value",
        details: { received: comparison.value }
      });
    }
  }
  const parsedAggregation =
    comparison.aggregation !== undefined
      ? parseAggregation(comparison.aggregation, "comparison.aggregation")
      : { aggregation, name: aggregationName };
  const resolvedColumn =
    comparison.column !== undefined
      ? requireNonEmptyString(comparison.column, "comparison.column").trim()
      : column;
  if (aggregationNeedsColumn(parsedAggregation.name) && !resolvedColumn) {
    throw new NumvizError(
      "`comparison.column` is required for this aggregation.",
      { code: "INVALID_CONFIG", path: "comparison.column" }
    );
  }
  const label =
    comparison.label === undefined
      ? "vs previous period"
      : requireNonEmptyString(comparison.label, "comparison.label").trim();
  const format = parseFormat(comparison.format, "comparison.format");
  const comparisonCurrency =
    comparison.currency === undefined
      ? currency
      : requireNonEmptyString(comparison.currency, "comparison.currency").trim();
  const filter = parseFilter(comparison.filter, "comparison.filter");
  const formatOptions = parseFormatOptions(
    comparison.formatOptions,
    "comparison.formatOptions"
  );
  return {
    config: {
      ...comparison,
      label,
      column: resolvedColumn,
      formatOptions,
      currency: comparisonCurrency
    },
    aggregation: parsedAggregation.aggregation,
    aggregationName: parsedAggregation.name,
    column: resolvedColumn,
    filter,
    format
  };
}

/** Validate configuration and apply metric defaults. */
export function resolveMetric(input: MetricConfig): ResolvedMetric {
  if (!isPlainObject(input)) {
    throw new NumvizError("`config` must be an object.", {
      code: "INVALID_CONFIG",
      path: "config"
    });
  }
  const config = input as MetricConfig;
  const name = requireNonEmptyString(config.name, "name").trim();
  const title =
    config.title === undefined ? name : requireNonEmptyString(config.title, "title").trim();
  if (config.data === undefined || config.data === null) {
    throw new NumvizError("`data` is required.", { code: "INVALID_DATA", path: "data" });
  }
  const parsedAggregation = parseAggregation(
    config.aggregation ?? "sum",
    "aggregation"
  );
  const column = optionalString(config.column, "column")?.trim();
  if (aggregationNeedsColumn(parsedAggregation.name) && !column) {
    throw new NumvizError(
      "`column` is required for this aggregation.",
      { code: "INVALID_CONFIG", path: "column" }
    );
  }
  const filter = parseFilter(config.filter, "filter");
  const format = parseFormat(config.format, "format");
  const formatOptions = parseFormatOptions(config.formatOptions, "formatOptions");
  const locale =
    config.locale === undefined
      ? "en-US"
      : requireNonEmptyString(config.locale, "locale").trim();
  const currency =
    config.currency === undefined
      ? "USD"
      : requireNonEmptyString(config.currency, "currency").trim();
  const trend = config.trend ?? "auto";
  if (!TRENDS.includes(trend)) {
    throw new NumvizError("`trend` must be auto, up, down, flat or false.", {
      code: "INVALID_CONFIG",
      path: "trend",
      details: { received: trend }
    });
  }
  const positiveDirection = config.positiveDirection ?? "up";
  if (!POSITIVE_DIRECTIONS.includes(positiveDirection)) {
    throw new NumvizError("`positiveDirection` must be up or down.", {
      code: "INVALID_CONFIG",
      path: "positiveDirection",
      details: { received: positiveDirection }
    });
  }
  const variant = config.variant ?? "default";
  if (!VARIANTS.includes(variant)) {
    throw new NumvizError(
      `\`variant\` must be one of: ${VARIANTS.join(", ")}.`,
      { code: "INVALID_CONFIG", path: "variant", details: { received: variant } }
    );
  }
  let icon = config.icon;
  if (icon !== undefined) {
    if (typeof icon === "string") {
      icon = requireNonEmptyString(icon, "icon");
    } else if (!isDomNode(icon)) {
      throw new NumvizError("`icon` must be a string or DOM node.", {
        code: "INVALID_CONFIG",
        path: "icon",
        details: { received: typeof icon }
      });
    }
  }
  const loading = config.loading ?? false;
  if (typeof loading !== "boolean") {
    throw new NumvizError("`loading` must be a boolean.", {
      code: "INVALID_CONFIG",
      path: "loading"
    });
  }
  if (config.error !== undefined && config.error !== null) {
    requireNonEmptyString(config.error, "error");
  }
  const emptyMessage =
    config.emptyMessage === undefined
      ? "No data"
      : requireNonEmptyString(config.emptyMessage, "emptyMessage");
  const description =
    config.description === undefined ? undefined : String(config.description);
  const ariaLabel =
    config.ariaLabel === undefined
      ? undefined
      : requireNonEmptyString(config.ariaLabel, "ariaLabel");
  const prefix = config.prefix === undefined ? undefined : String(config.prefix);
  const suffix = config.suffix === undefined ? undefined : String(config.suffix);
  const color =
    config.color === undefined
      ? undefined
      : requireNonEmptyString(config.color, "color").trim();
  const comparison =
    config.comparison === undefined
      ? undefined
      : parseComparison(
          config.comparison,
          parsedAggregation.aggregation,
          parsedAggregation.name,
          column,
          currency
        );

  return {
    config: {
      ...config,
      name,
      title,
      column,
      filter,
      format,
      formatOptions,
      locale,
      currency,
      trend,
      positiveDirection,
      variant,
      icon,
      loading,
      error: config.error ?? null,
      emptyMessage,
      description,
      ariaLabel,
      prefix,
      suffix,
      color,
      className:
        config.className === undefined
          ? undefined
          : requireNonEmptyString(config.className, "className"),
      theme: resolveThemeConfig(config.theme),
      comparison: comparison?.config
    },
    aggregation: parsedAggregation.aggregation,
    aggregationName: parsedAggregation.name,
    comparison
  };
}
