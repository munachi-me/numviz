/**
 * Public type definitions for Numviz.
 */
import type { NumvizError as NumvizErrorClass } from "./errors.js";

/** Chart types available in the core package. */
export type ChartType = "bar" | "line" | "pie" | "doughnut";

/** A single record of object-shaped input data. */
export type DataRecord = Record<string, unknown>;

/** A single record of array-shaped input data. */
export type DataMatrixRow = readonly unknown[];

/** Supported column kinds after normalization. */
export type ColumnType = "number" | "date" | "string" | "boolean";

/** Explicit column definition for array-shaped data. */
export interface ColumnDefinition {
  readonly key: string;
  readonly label?: string;
  readonly type?: ColumnType;
}

export type ColumnInput = string | ColumnDefinition;

/**
 * Structural shape compatible with Numiq datasets. Numviz only relies on this
 * public shape and never reaches into Numiq internals.
 */
export interface DatasetLike {
  readonly columns?: readonly ColumnInput[];
  readonly rows?: readonly (DataRecord | DataMatrixRow)[];
  readonly data?: readonly DataRecord[];
}

/** Accepted input data. The source is never mutated. */
export type DataInput = readonly DataRecord[] | readonly DataMatrixRow[] | DatasetLike;

/** Theme mode. `system` follows the operating system preference when available. */
export type ThemeMode = "light" | "dark" | "system";

/** Design tokens resolved from a theme configuration. */
export interface ThemeTokens {
  readonly mode: "light" | "dark";
  readonly background: string;
  readonly surface: string;
  readonly surfaceElevated: string;
  readonly text: string;
  readonly mutedText: string;
  readonly border: string;
  readonly grid: string;
  readonly accent: string;
  readonly positive: string;
  readonly warning: string;
  readonly danger: string;
  readonly info: string;
  readonly fontFamily: string;
  readonly borderRadius: number;
  readonly chartPalette: readonly string[];
}

/** Theme configuration accepted by charts. */
export interface ThemeConfig {
  mode?: ThemeMode;
  accent?: string;
  fontFamily?: string;
  borderRadius?: number;
  chartPalette?: readonly string[];
  background?: string;
  surface?: string;
  text?: string;
  mutedText?: string;
  border?: string;
  grid?: string;
}

/** Context passed to tooltip formatters. */
export interface TooltipContext {
  readonly label: string;
  readonly field: string;
  readonly index: number;
}

export type ValueFormatter = (value: number, context: TooltipContext) => string;

export interface TooltipConfig {
  show?: boolean;
  formatter?: ValueFormatter;
}

export interface LabelConfig {
  show?: boolean;
  formatter?: (value: number, label: string) => string;
}

export type LegendPosition = "top" | "bottom" | "left" | "right";

export interface LegendConfig {
  show?: boolean;
  position?: LegendPosition;
}

export interface MarginConfig {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** Chart configuration. */
export interface ChartConfig {
  type: ChartType;
  data: DataInput;
  /** Category / X field. Alias: `category`. */
  x?: string;
  /** Value / Y field. Alias: `value`. */
  y?: string;
  category?: string;
  value?: string;
  /** Column definitions, required for array-of-arrays input. */
  columns?: readonly ColumnInput[];
  title?: string;
  subtitle?: string;
  width?: number;
  height?: number;
  /** Series colours. Alias: `theme.chartPalette`. */
  palette?: readonly string[];
  background?: string;
  legend?: boolean | LegendConfig;
  labels?: boolean | LabelConfig;
  tooltip?: boolean | TooltipConfig;
  margin?: number | Partial<MarginConfig>;
  theme?: ThemeConfig;
  ariaLabel?: string;
}

/** Chart configuration after defaults, aliases and validation are applied. */
export interface ResolvedChartConfig {
  readonly type: ChartType;
  readonly x: string;
  readonly y: string;
  readonly title?: string;
  readonly subtitle?: string;
  readonly width: number;
  readonly height: number;
  readonly palette: readonly string[];
  readonly background: string;
  readonly legend: { readonly show: boolean; readonly position: LegendPosition };
  readonly labels: { readonly show: boolean; readonly formatter?: (value: number, label: string) => string };
  readonly tooltip: { readonly show: boolean; readonly formatter?: ValueFormatter };
  readonly margin: MarginConfig;
  readonly theme: ThemeConfig;
  readonly ariaLabel?: string;
}

export interface NormalizedColumn {
  readonly key: string;
  readonly label: string;
  readonly type: ColumnType;
}

export type NormalizedValue = number | string | boolean | Date | null;

export interface NormalizedRow {
  readonly index: number;
  readonly values: Readonly<Record<string, NormalizedValue>>;
  readonly source: DataRecord | DataMatrixRow;
}

/** Normalized, read-only view of the input data. */
export interface NormalizedDataset {
  readonly columns: readonly NormalizedColumn[];
  readonly rows: readonly NormalizedRow[];
  readonly source: DataInput;
  readonly empty: boolean;
}

/** A chart instance created by {@link createChart}. */
export interface Chart {
  readonly config: ResolvedChartConfig;
  readonly data: NormalizedDataset;
  readonly element: HTMLElement | null;
  readonly isDestroyed: boolean;
  /** Render the chart into a selector or DOM element. */
  render(target: string | Element): Chart;
  /** Remove rendered output and release listeners. */
  destroy(): void;
}

/** Shape of the default `Numviz` namespace export. */
export interface NumvizNamespace {
  readonly createChart: (config: ChartConfig) => Chart;
  readonly version: string;
  readonly NumvizError: typeof NumvizErrorClass;
}
