import { NumvizError } from "../errors.js";
import type { MetricFormat, MetricFormatContext, MetricFormatPreset } from "./types.js";

const PRESETS: readonly MetricFormatPreset[] = ["number", "currency", "percent", "compact"];

export function parseFormat(value: unknown, path: string): MetricFormat | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "function") return value as MetricFormat;
  if (typeof value !== "string" || !PRESETS.includes(value as MetricFormatPreset)) {
    throw new NumvizError(`\`${path}\` must be one of: ${PRESETS.join(", ")} or a function.`, {
      code: "INVALID_CONFIG",
      path,
      details: { received: value }
    });
  }
  return value as MetricFormatPreset;
}

function numberOptions(preset: MetricFormatPreset): Intl.NumberFormatOptions {
  switch (preset) {
    case "currency":
      return { style: "currency", maximumFractionDigits: 2 };
    case "percent":
      return { style: "percent", maximumFractionDigits: 1 };
    case "compact":
      return { notation: "compact", maximumFractionDigits: 1 };
    default:
      return { maximumFractionDigits: 2 };
  }
}

function resolvedOptions(
  preset: MetricFormatPreset,
  options?: Intl.NumberFormatOptions
): Intl.NumberFormatOptions {
  const resolved: Intl.NumberFormatOptions = { ...numberOptions(preset), ...options };
  // Intl throws when a caller supplies a minimum above our default maximum.
  if (options?.minimumFractionDigits !== undefined && options.maximumFractionDigits === undefined) {
    delete resolved.maximumFractionDigits;
  }
  return resolved;
}

/** Format a metric value. Null and non-finite values return an empty string. */
export function formatMetricValue(
  value: number | null,
  format: MetricFormat | undefined,
  context: MetricFormatContext,
  options?: Intl.NumberFormatOptions
): string {
  if (value === null || !Number.isFinite(value)) return "";
  if (typeof format === "function") {
    const result = format(value, context);
    if (typeof result !== "string") {
      throw new NumvizError("A metric formatter must return a string.", {
        code: "INVALID_CONFIG",
        path: "format",
        details: { received: typeof result }
      });
    }
    return result;
  }
  const preset = format ?? "number";
  const resolved = resolvedOptions(preset, options);
  if (preset === "currency") resolved.currency = context.currency;
  return new Intl.NumberFormat(context.locale, resolved).format(value);
}

/** Format a signed difference using the metric's value format. */
export function formatMetricDifference(
  value: number | null,
  format: MetricFormat | undefined,
  context: MetricFormatContext,
  options?: Intl.NumberFormatOptions
): string {
  if (value === null || !Number.isFinite(value)) return "";
  if (typeof format === "function") {
    const result = format(value, context);
    if (typeof result !== "string") {
      throw new NumvizError("A metric formatter must return a string.", {
        code: "INVALID_CONFIG",
        path: "format",
        details: { received: typeof result }
      });
    }
    return result;
  }
  const preset = format ?? "number";
  const resolved = resolvedOptions(preset, { signDisplay: "exceptZero", ...options });
  if (preset === "currency") resolved.currency = context.currency;
  return new Intl.NumberFormat(context.locale, resolved).format(value);
}

/** Format a percentage change expressed in percentage points. */
export function formatPercentageChange(value: number | null, locale: string): string {
  if (value === null || !Number.isFinite(value)) return "";
  return `${new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
    signDisplay: "exceptZero"
  }).format(value)}%`;
}

/** Default format for an aggregation when none is configured. */
export function defaultFormatFor(aggregation: string): MetricFormatPreset {
  return aggregation === "percentage" ? "percent" : "number";
}
