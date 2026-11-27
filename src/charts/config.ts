import { NumvizError } from "../errors.js";
import { normalizeData } from "../data/normalize.js";
import type {
  ChartConfig,
  ChartType,
  NormalizedDataset,
  ResolvedChartConfig,
  ResolvedSeries,
  SeriesConfig
} from "../types.js";
import {
  resolveAnimation,
  resolveAxis,
  resolveBins,
  resolveHeight,
  resolveLabels,
  resolveLegend,
  resolveMargin,
  resolvePalette,
  resolveTooltip,
  resolveWidth
} from "./options.js";
import { resolveThemeConfig } from "../theme/validate.js";
import { isPlainObject, requireBoolean, requireNonEmptyString } from "../utils/validate.js";

export const CHART_TYPES: readonly ChartType[] = [
  "bar",
  "line",
  "pie",
  "doughnut",
  "area",
  "stacked-bar",
  "grouped-bar",
  "horizontal-bar",
  "scatter",
  "histogram",
  "radar"
];

const ARC_TYPES: readonly ChartType[] = ["pie", "doughnut"];

export interface ResolvedChart {
  readonly config: ResolvedChartConfig;
  readonly data: NormalizedDataset;
}

interface SeriesContext {
  readonly config: ChartConfig;
  readonly data: NormalizedDataset;
  readonly palette: readonly string[];
  readonly yKey: string;
}

function resolveSeries(context: SeriesContext): ResolvedSeries[] {
  const { config, data, palette, yKey } = context;
  const definitions: readonly SeriesConfig[] =
    config.series && config.series.length > 0 ? config.series : [{ field: yKey }];
  const seen = new Set<string>();
  const available = data.columns.map((column) => column.key);

  return definitions.map((definition, index) => {
    if (
      !isPlainObject(definition) ||
      typeof definition.field !== "string" ||
      definition.field.trim() === ""
    ) {
      throw new NumvizError("Each series must be an object with a non-empty `field`.", {
        code: "INVALID_CONFIG",
        path: `series[${index}]`
      });
    }
    const field = definition.field.trim();
    if (seen.has(field)) {
      throw new NumvizError(`Duplicate series field "${field}".`, {
        code: "INVALID_CONFIG",
        path: `series[${index}].field`
      });
    }
    seen.add(field);
    const column = data.columns.find((entry) => entry.key === field);
    if (!column && !data.empty) {
      throw new NumvizError(`Unknown series field "${field}". Available fields: ${available.join(", ")}.`, {
        code: "INVALID_CONFIG",
        path: `series[${index}].field`,
        details: { available }
      });
    }
    if (column && column.type !== "number" && !data.empty) {
      const hasValue = data.rows.some(
        (row) => row.values[field] !== null && row.values[field] !== undefined
      );
      if (hasValue) {
        throw new NumvizError(
          `Series field "${field}" must contain numeric values. Its normalized type is "${column.type}".`,
          { code: "INVALID_DATA", path: `series[${index}].field` }
        );
      }
    }
    if (definition.label !== undefined) {
      requireNonEmptyString(definition.label, `series[${index}].label`);
    }
    if (definition.color !== undefined) {
      requireNonEmptyString(definition.color, `series[${index}].color`);
    }
    return {
      index,
      field,
      label: definition.label ?? column?.label ?? field,
      color: definition.color ?? (palette[index % palette.length] as string)
    };
  });
}

function validateStrings(config: ChartConfig): void {
  for (const [path, value] of [
    ["title", config.title],
    ["subtitle", config.subtitle],
    ["background", config.background],
    ["className", config.className],
    ["ariaLabel", config.ariaLabel]
  ] as const) {
    if (value !== undefined && typeof value !== "string") {
      throw new NumvizError(`\`${path}\` must be a string.`, { code: "INVALID_CONFIG", path });
    }
  }
  if (config.onClick !== undefined && typeof config.onClick !== "function") {
    throw new NumvizError("`onClick` must be a function.", {
      code: "INVALID_CONFIG",
      path: "onClick"
    });
  }
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
  validateStrings(config);

  const isArc = ARC_TYPES.includes(config.type);
  const isHistogram = config.type === "histogram";
  const xField = config.x ?? config.category;
  const yField = config.y ?? config.value;

  if (!isHistogram && (typeof xField !== "string" || xField.trim() === "")) {
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

  if (config.responsive !== undefined) requireBoolean(config.responsive, "responsive");
  if (config.series !== undefined) {
    if (!Array.isArray(config.series)) {
      throw new NumvizError("`series` must be an array of series definitions.", {
        code: "INVALID_CONFIG",
        path: "series",
        details: { received: typeof config.series }
      });
    }
    if (config.series.length === 0) {
      throw new NumvizError("`series` must contain at least one series definition.", {
        code: "INVALID_CONFIG",
        path: "series"
      });
    }
  }

  const theme = resolveThemeConfig(config.theme);
  const data = normalizeData(config.data, config.columns);
  const palette = resolvePalette(config, theme);
  const xKey = typeof xField === "string" ? xField.trim() : "";
  const yKey = yField.trim();
  const available = data.columns.map((column) => column.key);

  const findColumn = (key: string, path: string) => {
    const column = data.columns.find((entry) => entry.key === key);
    if (!column && !data.empty) {
      throw new NumvizError(`Unknown field "${key}". Available fields: ${available.join(", ")}.`, {
        code: "INVALID_CONFIG",
        path,
        details: { available }
      });
    }
    return column;
  };

  const yColumn = findColumn(yKey, "y");
  if (yColumn && !data.empty) {
    const hasValue = data.rows.some(
      (row) => row.values[yKey] !== null && row.values[yKey] !== undefined
    );
    if (yColumn.type !== "number" && hasValue) {
      throw new NumvizError(
        `Value field "${yKey}" must contain numeric values. Its normalized type is "${yColumn.type}".`,
        { code: "INVALID_DATA", path: "y", details: { field: yKey, type: yColumn.type } }
      );
    }
  }

  const xColumn = xKey ? findColumn(xKey, "x") : undefined;
  if (config.type === "scatter" && xColumn && xColumn.type !== "number" && xColumn.type !== "date") {
    throw new NumvizError(
      `Scatter charts need a numeric or date X field. "${xKey}" is "${xColumn.type}".`,
      { code: "INVALID_DATA", path: "x", details: { field: xKey, type: xColumn.type } }
    );
  }

  const series = isArc ? [] : resolveSeries({ config, data, palette, yKey });

  const resolved: ResolvedChartConfig = {
    type: config.type,
    x: xKey,
    y: yKey,
    series,
    width: resolveWidth(config),
    height: resolveHeight(config),
    palette,
    background: config.background ?? "",
    legend: resolveLegend(config, series.length > 1),
    labels: resolveLabels(config),
    tooltip: resolveTooltip(config),
    margin: resolveMargin(config.margin),
    theme,
    xAxis: resolveAxis(
      config.xAxis,
      "xAxis",
      config.type === "horizontal-bar" || config.type === "histogram"
    ),
    yAxis: resolveAxis(config.yAxis, "yAxis", true),
    responsive: config.responsive ?? true,
    animation: resolveAnimation(config.animation),
    ...(config.title !== undefined ? { title: config.title } : {}),
    ...(config.subtitle !== undefined ? { subtitle: config.subtitle } : {}),
    ...(config.className !== undefined ? { className: config.className } : {}),
    ...(config.ariaLabel !== undefined ? { ariaLabel: config.ariaLabel } : {}),
    ...(config.bins !== undefined ? { bins: resolveBins(config.bins) } : {}),
    ...(config.onClick !== undefined ? { onClick: config.onClick } : {})
  };

  return { config: resolved, data };
}
