import { NumvizError } from "../errors.js";
import { resolveThemeConfig } from "../theme/validate.js";
import { DEFAULT_PALETTE } from "../theme/tokens.js";
import {
  isPlainObject,
  requireBoolean,
  requireCallback,
  requireNonEmptyString,
  requirePositiveNumber
} from "../utils/validate.js";
import type {
  AnimationConfig,
  AxisConfig,
  ChartConfig,
  ChartType,
  LabelConfig,
  LabelPosition,
  LegendConfig,
  LegendPosition,
  MarginConfig,
  ResolvedAxis,
  ResolvedChartConfig,
  ThemeConfig,
  TooltipConfig
} from "../types.js";

export { resolveThemeConfig };

const LEGEND_POSITIONS: readonly LegendPosition[] = ["top", "bottom", "left", "right"];
const LABEL_POSITIONS: readonly LabelPosition[] = ["auto", "inside", "outside"];
const ARC_TYPES: readonly ChartType[] = ["pie", "doughnut"];

const DEFAULT_MARGIN: MarginConfig = { top: 16, right: 20, bottom: 44, left: 56 };
const DEFAULT_WIDTH = 720;
const DEFAULT_HEIGHT = 380;

export function resolveWidth(config: ChartConfig): number {
  return requirePositiveNumber(config.width, "width", DEFAULT_WIDTH);
}

export function resolveHeight(config: ChartConfig): number {
  return requirePositiveNumber(config.height, "height", DEFAULT_HEIGHT);
}

export function resolvePalette(config: ChartConfig, theme: ThemeConfig): readonly string[] {
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

export function resolveMargin(margin: ChartConfig["margin"]): MarginConfig {
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

export function resolveLegend(
  config: ChartConfig,
  hasSeries: boolean
): ResolvedChartConfig["legend"] {
  const isArc = ARC_TYPES.includes(config.type);
  const defaultShow = isArc || hasSeries;
  const defaultPosition: LegendPosition = isArc ? "right" : "top";
  if (config.legend === undefined) {
    return { show: defaultShow, position: defaultPosition, interactive: true };
  }
  if (typeof config.legend === "boolean") {
    return { show: config.legend, position: defaultPosition, interactive: true };
  }
  if (!isPlainObject(config.legend)) {
    throw new NumvizError("`legend` must be a boolean or an object with show/position.", {
      code: "INVALID_CONFIG",
      path: "legend"
    });
  }
  const legend = config.legend as LegendConfig;
  if (legend.show !== undefined) requireBoolean(legend.show, "legend.show");
  if (legend.interactive !== undefined) requireBoolean(legend.interactive, "legend.interactive");
  const position = legend.position ?? defaultPosition;
  if (!LEGEND_POSITIONS.includes(position)) {
    throw new NumvizError(`\`legend.position\` must be one of: ${LEGEND_POSITIONS.join(", ")}.`, {
      code: "INVALID_CONFIG",
      path: "legend.position",
      details: { received: position }
    });
  }
  return { show: legend.show ?? true, position, interactive: legend.interactive ?? true };
}

export function resolveLabels(config: ChartConfig): ResolvedChartConfig["labels"] {
  if (config.labels === undefined) return { show: false, position: "auto" };
  if (typeof config.labels === "boolean") return { show: config.labels, position: "auto" };
  if (!isPlainObject(config.labels)) {
    throw new NumvizError("`labels` must be a boolean or an object with show/position/formatter.", {
      code: "INVALID_CONFIG",
      path: "labels"
    });
  }
  const labels = config.labels as LabelConfig;
  if (labels.show !== undefined) requireBoolean(labels.show, "labels.show");
  if (labels.formatter !== undefined) requireCallback(labels.formatter, "labels.formatter");
  const position = labels.position ?? "auto";
  if (!LABEL_POSITIONS.includes(position)) {
    throw new NumvizError(`\`labels.position\` must be one of: ${LABEL_POSITIONS.join(", ")}.`, {
      code: "INVALID_CONFIG",
      path: "labels.position",
      details: { received: position }
    });
  }
  const show = labels.show ?? true;
  return labels.formatter ? { show, position, formatter: labels.formatter } : { show, position };
}

export function resolveTooltip(config: ChartConfig): ResolvedChartConfig["tooltip"] {
  if (config.tooltip === undefined) return { show: true };
  if (typeof config.tooltip === "boolean") return { show: config.tooltip };
  if (!isPlainObject(config.tooltip)) {
    throw new NumvizError("`tooltip` must be a boolean or an object with show/formatter.", {
      code: "INVALID_CONFIG",
      path: "tooltip"
    });
  }
  const tooltip = config.tooltip as TooltipConfig;
  if (tooltip.show !== undefined) requireBoolean(tooltip.show, "tooltip.show");
  if (tooltip.formatter !== undefined) requireCallback(tooltip.formatter, "tooltip.formatter");
  const show = tooltip.show ?? true;
  return tooltip.formatter ? { show, formatter: tooltip.formatter } : { show };
}

export function resolveAxis(
  input: AxisConfig | undefined,
  path: string,
  defaultGrid: boolean
): ResolvedAxis {
  if (input === undefined) return { show: true, grid: defaultGrid, rotate: 0 };
  if (!isPlainObject(input)) {
    throw new NumvizError(`\`${path}\` must be an object.`, { code: "INVALID_CONFIG", path });
  }
  const axis = input as AxisConfig;
  if (axis.show !== undefined && typeof axis.show !== "boolean") {
    throw new NumvizError(`\`${path}.show\` must be a boolean.`, {
      code: "INVALID_CONFIG",
      path: `${path}.show`
    });
  }
  if (axis.grid !== undefined && typeof axis.grid !== "boolean") {
    throw new NumvizError(`\`${path}.grid\` must be a boolean.`, {
      code: "INVALID_CONFIG",
      path: `${path}.grid`
    });
  }
  if (
    axis.rotate !== undefined &&
    (typeof axis.rotate !== "number" ||
      !Number.isFinite(axis.rotate) ||
      Math.abs(axis.rotate) > 90)
  ) {
    throw new NumvizError(`\`${path}.rotate\` must be a number between -90 and 90.`, {
      code: "INVALID_CONFIG",
      path: `${path}.rotate`
    });
  }
  if (axis.title !== undefined) requireNonEmptyString(axis.title, `${path}.title`);
  if (axis.tickFormat !== undefined) requireCallback(axis.tickFormat, `${path}.tickFormat`);
  for (const bound of ["min", "max"] as const) {
    const value = axis[bound];
    if (value !== undefined && (typeof value !== "number" || !Number.isFinite(value))) {
      throw new NumvizError(`\`${path}.${bound}\` must be a finite number.`, {
        code: "INVALID_CONFIG",
        path: `${path}.${bound}`
      });
    }
  }
  if (axis.min !== undefined && axis.max !== undefined && axis.min >= axis.max) {
    throw new NumvizError(`\`${path}.min\` must be less than \`${path}.max\`.`, {
      code: "INVALID_CONFIG",
      path
    });
  }
  return {
    show: axis.show ?? true,
    grid: axis.grid ?? defaultGrid,
    rotate: axis.rotate ?? 0,
    ...(axis.title !== undefined ? { title: axis.title } : {}),
    ...(axis.tickFormat !== undefined ? { tickFormat: axis.tickFormat } : {}),
    ...(axis.min !== undefined ? { min: axis.min } : {}),
    ...(axis.max !== undefined ? { max: axis.max } : {})
  };
}

export function resolveAnimation(input: ChartConfig["animation"]): ResolvedChartConfig["animation"] {
  if (input === undefined) return { enabled: true, duration: 240 };
  if (typeof input === "boolean") return { enabled: input, duration: 240 };
  if (!isPlainObject(input)) {
    throw new NumvizError("`animation` must be a boolean or an object with enabled/duration.", {
      code: "INVALID_CONFIG",
      path: "animation"
    });
  }
  const animation = input as AnimationConfig;
  if (animation.enabled !== undefined) requireBoolean(animation.enabled, "animation.enabled");
  if (
    animation.duration !== undefined &&
    (typeof animation.duration !== "number" ||
      !Number.isFinite(animation.duration) ||
      animation.duration < 0)
  ) {
    throw new NumvizError("`animation.duration` must be a non-negative finite number.", {
      code: "INVALID_CONFIG",
      path: "animation.duration",
      details: { received: animation.duration }
    });
  }
  return { enabled: animation.enabled ?? true, duration: animation.duration ?? 240 };
}

export function resolveBins(input: ChartConfig["bins"]): number | undefined {
  if (input === undefined) return undefined;
  if (typeof input !== "number" || !Number.isInteger(input) || input < 1 || input > 200) {
    throw new NumvizError("`bins` must be an integer between 1 and 200.", {
      code: "INVALID_CONFIG",
      path: "bins"
    });
  }
  return input;
}

export { DEFAULT_HEIGHT, DEFAULT_WIDTH };
