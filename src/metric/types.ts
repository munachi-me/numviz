import type {
  ColumnInput,
  DataInput,
  DataMatrixRow,
  DataRecord,
  NormalizedDataset,
  NormalizedRow,
  NormalizedValue,
  ThemeConfig
} from "../types.js";

/** Accepted aliases for built-in aggregations. */
export type MetricAggregationAlias =
  | "avg"
  | "mean"
  | "min"
  | "max"
  | "distinct"
  | "distinctCount"
  | "percent";

/** Built-in metric aggregations. */
export type MetricAggregationName =
  | "sum"
  | "average"
  | "count"
  | "distinct-count"
  | "minimum"
  | "maximum"
  | "median"
  | "percentage"
  | "custom";

/** One normalized row exposed to filters and custom aggregations. */
export interface MetricRowContext {
  readonly index: number;
  readonly values: Readonly<Record<string, NormalizedValue>>;
  readonly row: DataRecord | DataMatrixRow;
}

/** Callback filter; return true to keep a row. */
export type MetricRowFilter = (row: MetricRowContext) => boolean;

/** Filter by callback or by exact normalized-value matches. */
export type MetricFilter = MetricRowFilter | Readonly<Record<string, unknown>>;

/** Context passed to custom aggregation functions. */
export interface MetricContext {
  readonly rows: readonly NormalizedRow[];
  readonly values: readonly number[];
  readonly column?: string;
  readonly totalRowCount: number;
  readonly matchedRowCount: number;
  readonly dataset: NormalizedDataset;
}

/** Custom aggregation. Return a finite number or null when no value exists. */
export type MetricAggregator = (context: MetricContext) => number | null;

/** A built-in aggregation name, alias or custom function. */
export type MetricAggregation =
  | MetricAggregationName
  | MetricAggregationAlias
  | MetricAggregator;

/** Built-in metric value formats. */
export type MetricFormatPreset = "number" | "currency" | "percent" | "compact";

/** Context passed to metric value formatters. */
export interface MetricFormatContext {
  readonly name: string;
  readonly aggregation: MetricAggregationName;
  readonly column?: string;
  readonly locale: string;
  readonly currency: string;
}

/** Format a metric value, including null for empty values. */
export type MetricFormatter = (value: number | null, context: MetricFormatContext) => string;

/** A format preset or custom formatter. */
export type MetricFormat = MetricFormatPreset | MetricFormatter;

/** Trend direction. `auto` follows the comparison; `false` hides the trend. */
export type MetricTrend = "auto" | "up" | "down" | "flat" | false;

/** Comparison direction derived from the raw values. */
export type MetricDirection = "up" | "down" | "flat";

/** Visual state derived from the trend and `positiveDirection`. */
export type MetricState = "positive" | "negative" | "neutral";

/** Built-in KPI card variants. */
export type MetricVariant = "default" | "compact" | "bordered" | "highlight";

/** A developer-supplied icon: a DOM node or a text glyph. */
export type MetricIcon = string | Node;

/** Comparison against a previous dataset or a fixed previous value. */
export interface MetricComparisonConfig {
  readonly data?: DataInput;
  readonly value?: number | null;
  readonly column?: string;
  readonly columns?: readonly ColumnInput[];
  readonly aggregation?: MetricAggregation;
  readonly filter?: MetricFilter;
  readonly label?: string;
  readonly format?: MetricFormat;
  readonly formatOptions?: Intl.NumberFormatOptions;
  readonly currency?: string;
}

/** Computed comparison details. */
export interface MetricComparisonResult {
  readonly source: "data" | "value";
  readonly value: number | null;
  readonly formattedValue: string;
  readonly difference: number | null;
  readonly formattedDifference: string;
  readonly percentageChange: number | null;
  readonly growth: number | null;
  readonly direction: MetricDirection | null;
  readonly label: string;
  readonly rowCount: number;
  readonly matchedRowCount: number;
  readonly validCount: number;
}

/** Fully computed metric value, formatted value and metadata. */
export interface MetricResult {
  readonly name: string;
  readonly title: string;
  readonly value: number | null;
  readonly formattedValue: string;
  readonly description?: string;
  readonly prefix?: string;
  readonly suffix?: string;
  readonly aggregation: MetricAggregationName;
  readonly column?: string;
  readonly locale: string;
  readonly currency: string;
  readonly rowCount: number;
  readonly matchedRowCount: number;
  readonly validCount: number;
  readonly missingCount: number;
  readonly comparison: MetricComparisonResult | null;
  readonly direction: MetricDirection | null;
  readonly trend: MetricDirection | null;
  readonly state: MetricState;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** Configuration accepted by {@link createMetric}. */
export interface MetricConfig {
  readonly name: string;
  readonly title?: string;
  readonly data: DataInput;
  readonly columns?: readonly ColumnInput[];
  readonly column?: string;
  readonly aggregation?: MetricAggregation;
  readonly filter?: MetricFilter;
  readonly description?: string;
  readonly format?: MetricFormat;
  readonly formatOptions?: Intl.NumberFormatOptions;
  readonly locale?: string;
  readonly currency?: string;
  readonly prefix?: string;
  readonly suffix?: string;
  readonly comparison?: MetricComparisonConfig;
  readonly trend?: MetricTrend;
  readonly positiveDirection?: "up" | "down";
  readonly icon?: MetricIcon;
  readonly color?: string;
  readonly variant?: MetricVariant;
  readonly theme?: ThemeConfig;
  readonly className?: string;
  readonly loading?: boolean;
  readonly error?: string | null;
  readonly emptyMessage?: string;
  readonly ariaLabel?: string;
}

/** A metric instance created by {@link createMetric}. */
export interface Metric {
  readonly config: MetricConfig;
  readonly result: MetricResult;
  readonly element: HTMLElement | null;
  readonly isDestroyed: boolean;
  /** Render the KPI card into a selector or element. */
  render(target: string | Element): Metric;
  /** Re-resolve configuration, recompute and re-render. */
  update(config: MetricConfig): Metric;
  /** Replace metric data and recompute. */
  setData(data: DataInput): Metric;
  setLoading(loading: boolean): Metric;
  setError(message: string | null): Metric;
  /** Recompute against current data without changing configuration. */
  refresh(): Metric;
  destroy(): void;
}
