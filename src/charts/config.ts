import { NumvizError } from "../errors.js";
import { normalizeData } from "../data/normalize.js";
import { DEFAULT_PALETTE } from "../theme/tokens.js";
import type {
  ChartConfig,
  ChartType,
  LabelConfig,
  LegendConfig,
  LegendPosition,
  MarginConfig,
  NormalizedDataset,
  ResolvedChartConfig,
  ThemeConfig,
  ThemeMode,
  TooltipConfig
} from "../types.js";

const CHART_TYPES: readonly ChartType[] = ["bar", "line", "pie", "doughnut"];
const LEGEND_POSITIONS: readonly LegendPosition[] = ["top", "bottom", "left", "right"];
const THEME_MODES: readonly ThemeMode[] = ["light", "dark", "system"];

const DEFAULT_MARGIN: MarginConfig = { top: 16, right: 20, bottom: 44, left: 56 };
const DEFAULT_WIDTH = 720;
const DEFAULT_HEIGHT = 380;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requirePositiveNumber(value: unknown, path: string, fallback: number): number {
  if (value === undefined) return fallback;
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new NumvizError(`\`${path}\` must be a positive finite number.`, {
      code: "INVALID_CONFIG",
      path,
      details: { received: value }
    });
  }
  return value;
}

function resolvePalette(config: ChartConfig, theme: ThemeConfig): readonly string[] {
  const candidate = config.palette ?? theme.chartPalette ?? DEFAULT_PALETTE;
  if (!Array.isArray(candidate) || candidate.length === 0) {
    throw new NumvizError("`palette` must be a non-empty array of CSS colour strings.", {
      code: "INVALID_CONFIG",
      path: "palette"
    });
  }
  candidate.forEach((color, index) => {
    if (typeof color !== "string" || color.trim() === "") {
      throw new NumvizError("Every palette colour must be a non-empty string.", {
        code: "INVALID_CONFIG",
        path: `palette[${index}]`
      });
    }
  });
  return [...candidate];
}

function resolveMargin(margin: ChartConfig["margin"]): MarginConfig {
  if (margin === undefined) return { ...DEFAULT_MARGIN };
  if (typeof margin === "number") {
    if (!Number.isFinite(margin) || margin < 0) {
      throw new NumvizError("`margin` must be a non-negative number.", {
        code: "INVALID_CONFIG",
        path: "margin"
      });
    }
    return { top: margin, right: margin, bottom: margin, left: margin };
  }
  if (!isPlainObject(margin)) {
    throw new NumvizError("`margin` must be a number or an object with top/right/bottom/left.", {
      code: "INVALID_CONFIG",
      path: "margin"
    });
  }
  const resolved = { ...DEFAULT_MARGIN };
  for (const side of ["top", "right", "bottom", "left"] as const) {
    const value = margin[side];
    if (value === undefined) continue;
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      throw new NumvizError(`\`margin.${side}\` must be a non-negative number.`, {
        code: "INVALID_CONFIG",
        path: `margin.${side}`
      });
    }
    resolved[side] = value;
  }
  return resolved;
}

function resolveThemeConfig(input: ChartConfig["theme"]): ThemeConfig {
  if (input === undefined) return {};
  if (!isPlainObject(input)) {
    throw new NumvizError("`theme` must be an object.", { code: "INVALID_CONFIG", path: "theme" });
  }
  const theme = input as ThemeConfig;
  if (theme.mode !== undefined && !THEME_MODES.includes(theme.mode)) {
    throw new NumvizError(`\`theme.mode\` must be one of: ${THEME_MODES.join(", ")}.`, {
      code: "INVALID_CONFIG",
      path: "theme.mode",
      details: { received: theme.mode }
    });
  }
  if (
    theme.borderRadius !== undefined &&
    (typeof theme.borderRadius !== "number" || theme.borderRadius < 0)
  ) {
    throw new NumvizError("`theme.borderRadius` must be a non-negative number.", {
      code: "INVALID_CONFIG",
      path: "theme.borderRadius"
    });
  }
  return { ...theme };
}

function resolveLegend(config: ChartConfig): { show: boolean; position: LegendPosition } {
  const defaultShow = config.type === "pie" || config.type === "doughnut";
  const defaultPosition: LegendPosition = defaultShow ? "right" : "top";
  if (config.legend === undefined) return { show: defaultShow, position: defaultPosition };
  if (typeof config.legend === "boolean") return { show: config.legend, position: defaultPosition };
  if (!isPlainObject(config.legend)) {
    throw new NumvizError("`legend` must be a boolean or an object with show/position.", {
      code: "INVALID_CONFIG",
      path: "legend"
    });
  }
  const legend = config.legend as LegendConfig;
  const position = legend.position ?? defaultPosition;
  if (!LEGEND_POSITIONS.includes(position)) {
    throw new NumvizError(`\`legend.position\` must be one of: ${LEGEND_POSITIONS.join(", ")}.`, {
      code: "INVALID_CONFIG",
      path: "legend.position"
    });
  }
  return { show: legend.show ?? true, position };
}

function resolveLabels(config: ChartConfig): ResolvedChartConfig["labels"] {
  if (config.labels === undefined) return { show: false };
  if (typeof config.labels === "boolean") return { show: config.labels };
  if (!isPlainObject(config.labels)) {
    throw new NumvizError("`labels` must be a boolean or an object with show/formatter.", {
      code: "INVALID_CONFIG",
      path: "labels"
    });
  }
  const labels = config.labels as LabelConfig;
  const show = labels.show ?? true;
  return labels.formatter ? { show, formatter: labels.formatter } : { show };
}

function resolveTooltip(config: ChartConfig): ResolvedChartConfig["tooltip"] {
  if (config.tooltip === undefined) return { show: true };
  if (typeof config.tooltip === "boolean") return { show: config.tooltip };
  if (!isPlainObject(config.tooltip)) {
    throw new NumvizError("`tooltip` must be a boolean or an object with show/formatter.", {
      code: "INVALID_CONFIG",
      path: "tooltip"
    });
  }
  const tooltip = config.tooltip as TooltipConfig;
  const show = tooltip.show ?? true;
  return tooltip.formatter ? { show, formatter: tooltip.formatter } : { show };
}

export interface ResolvedChart {
  readonly config: ResolvedChartConfig;
  readonly data: NormalizedDataset;
}

/** Validate a user configuration and normalize its data. */
export function resolveChart(config: ChartConfig): ResolvedChart {
  if (!isPlainObject(config)) {
    throw new NumvizError("`createChart` requires a configuration object.", {
      code: "INVALID_CONFIG"
    });
  }
  if (!CHART_TYPES.includes(config.type)) {
    throw new NumvizError(`Unsupported chart type. Expected one of: ${CHART_TYPES.join(", ")}.`, {
      code: "INVALID_TYPE",
      path: "type",
      details: { received: config.type }
    });
  }
  if (config.data === undefined || config.data === null) {
    throw new NumvizError("`data` is required.", { code: "INVALID_CONFIG", path: "data" });
  }

  const xField = config.x ?? config.category;
  const yField = config.y ?? config.value;
  if (typeof xField !== "string" || xField.trim() === "") {
    throw new NumvizError(
      "A category field is required. Provide `x` (or `category`) with the name of the category column.",
      { code: "INVALID_CONFIG", path: "x" }
    );
  }
  if (typeof yField !== "string" || yField.trim() === "") {
    throw new NumvizError(
      "A value field is required. Provide `y` (or `value`) with the name of the numeric column.",
      { code: "INVALID_CONFIG", path: "y" }
    );
  }

  const theme = resolveThemeConfig(config.theme);
  const data = normalizeData(config.data, config.columns);
  const xKey = xField.trim();
  const yKey = yField.trim();

  if (!data.empty) {
    const xColumn = data.columns.find((column) => column.key === xKey);
    const yColumn = data.columns.find((column) => column.key === yKey);
    const available = data.columns.map((column) => column.key);
    if (!xColumn) {
      throw new NumvizError(
        `Unknown category field "${xKey}". Available fields: ${available.join(", ")}.`,
        { code: "INVALID_CONFIG", path: "x", details: { available } }
      );
    }
    if (!yColumn) {
      throw new NumvizError(
        `Unknown value field "${yKey}". Available fields: ${available.join(", ")}.`,
        { code: "INVALID_CONFIG", path: "y", details: { available } }
      );
    }
    const hasValue = data.rows.some((row) => row.values[yKey] !== null && row.values[yKey] !== undefined);
    if (yColumn.type !== "number" && hasValue) {
      throw new NumvizError(
        `Value field "${yKey}" must contain numeric values. Its normalized type is "${yColumn.type}".`,
        { code: "INVALID_DATA", path: "y", details: { field: yKey, type: yColumn.type } }
      );
    }
  }

  const title = config.title;
  const subtitle = config.subtitle;
  for (const [path, value] of [
    ["title", title],
    ["subtitle", subtitle]
  ] as const) {
    if (value !== undefined && typeof value !== "string") {
      throw new NumvizError(`\`${path}\` must be a string.`, { code: "INVALID_CONFIG", path });
    }
  }
  if (config.background !== undefined && typeof config.background !== "string") {
    throw new NumvizError("`background` must be a CSS colour string.", {
      code: "INVALID_CONFIG",
      path: "background"
    });
  }

  const resolved: ResolvedChartConfig = {
    type: config.type,
    x: xKey,
    y: yKey,
    width: requirePositiveNumber(config.width, "width", DEFAULT_WIDTH),
    height: requirePositiveNumber(config.height, "height", DEFAULT_HEIGHT),
    palette: resolvePalette(config, theme),
    background: config.background ?? "",
    legend: resolveLegend(config),
    labels: resolveLabels(config),
    tooltip: resolveTooltip(config),
    margin: resolveMargin(config.margin),
    theme,
    ...(title !== undefined ? { title } : {}),
    ...(subtitle !== undefined ? { subtitle } : {}),
    ...(config.ariaLabel !== undefined ? { ariaLabel: config.ariaLabel } : {})
  };

  return { config: resolved, data };
}
