import { NumvizError } from "../errors.js";
import { resolveThemeConfig } from "../theme/validate.js";
import type { ThemeConfig } from "../types.js";
import { isPlainObject, requireNonEmptyString } from "../utils/validate.js";
import { resolveFilters } from "./filters.js";
import type {
  DashboardAlignment,
  DashboardBreakpoint,
  DashboardBreakpoints,
  DashboardColumns,
  DashboardComponent,
  DashboardComponentLayout,
  DashboardConfig,
  DashboardCrossFilterConfig,
  DashboardFooterConfig,
  DashboardHeaderConfig,
  DashboardImageFit,
  DashboardLayout,
  DashboardPrintOptions,
  DashboardVariant,
  DashboardWidgetShadow,
  DashboardWidgetStyle,
  ResolvedDashboardConfig,
  ResolvedDashboardFooter,
  ResolvedDashboardFormat,
  ResolvedDashboardHeader,
  ResolvedDashboardLayout
} from "./types.js";

const BREAKPOINT_ORDER: readonly DashboardBreakpoint[] = ["sm", "md", "lg", "xl"];
const DEFAULT_BREAKPOINTS: Required<DashboardBreakpoints> = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280
};
const DEFAULT_COLUMNS: Required<DashboardColumns> = {
  base: 1,
  sm: 2,
  md: 2,
  lg: 3,
  xl: 4
};
const ALIGNMENTS: readonly DashboardAlignment[] = ["start", "center", "end", "stretch"];
const VARIANTS: readonly DashboardVariant[] = ["default", "compact", "flush"];
const SHADOWS: readonly DashboardWidgetShadow[] = ["none", "sm", "md", "lg"];
const IMAGE_FITS: readonly DashboardImageFit[] = ["cover", "contain"];
const COMPONENT_TYPES = [
  "chart",
  "table",
  "metric",
  "heading",
  "text",
  "description",
  "divider",
  "image",
  "custom"
] as const;

function optionalString(value: unknown, path: string): string | undefined {
  if (value === undefined) return undefined;
  return requireNonEmptyString(value, path);
}

/** Validate a CSS length or numeric pixel value. */
export function resolveCssLength(value: unknown, path: string, fallback: string): string {
  if (value === undefined) return fallback;
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 0) {
      throw new NumvizError(`\`${path}\` must be a non-negative finite number or CSS length.`, {
        code: "INVALID_CONFIG",
        path,
        details: { received: value }
      });
    }
    return `${value}px`;
  }
  if (typeof value === "string" && value.trim() !== "") return value;
  throw new NumvizError(`\`${path}\` must be a non-negative finite number or CSS length.`, {
    code: "INVALID_CONFIG",
    path,
    details: { received: value }
  });
}

function requireInteger(value: unknown, path: string, minimum: number, maximum?: number): number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < minimum ||
    (maximum !== undefined && value > maximum)
  ) {
    const range = maximum === undefined ? `an integer >= ${minimum}` : `an integer from ${minimum} to ${maximum}`;
    throw new NumvizError(`\`${path}\` must be ${range}.`, {
      code: "INVALID_CONFIG",
      path,
      details: { received: value }
    });
  }
  return value;
}

function resolveColumns(value: DashboardLayout["columns"]): Required<DashboardColumns> {
  if (value === undefined) return { ...DEFAULT_COLUMNS };
  if (typeof value === "number") {
    const count = requireInteger(value, "layout.columns", 1, 12);
    return { base: count, sm: count, md: count, lg: count, xl: count };
  }
  if (!isPlainObject(value)) {
    throw new NumvizError("`layout.columns` must be a number or an object of breakpoint counts.", {
      code: "INVALID_CONFIG",
      path: "layout.columns"
    });
  }
  const base =
    value.base === undefined ? 1 : requireInteger(value.base, "layout.columns.base", 1, 12);
  const sm =
    value.sm === undefined
      ? base
      : requireInteger(value.sm, "layout.columns.sm", 1, 12);
  const md =
    value.md === undefined
      ? sm
      : requireInteger(value.md, "layout.columns.md", 1, 12);
  const lg =
    value.lg === undefined
      ? md
      : requireInteger(value.lg, "layout.columns.lg", 1, 12);
  const xl =
    value.xl === undefined
      ? lg
      : requireInteger(value.xl, "layout.columns.xl", 1, 12);
  return { base, sm, md, lg, xl };
}

function resolveBreakpoints(value: DashboardLayout["breakpoints"]): Required<DashboardBreakpoints> {
  if (value === undefined) return { ...DEFAULT_BREAKPOINTS };
  if (!isPlainObject(value)) {
    throw new NumvizError("`layout.breakpoints` must be an object of minimum widths.", {
      code: "INVALID_CONFIG",
      path: "layout.breakpoints"
    });
  }
  const resolved = { ...DEFAULT_BREAKPOINTS };
  for (const name of BREAKPOINT_ORDER) {
    const width = value[name];
    if (width === undefined) continue;
    if (typeof width !== "number" || !Number.isFinite(width) || width <= 0) {
      throw new NumvizError(`\`layout.breakpoints.${name}\` must be a positive finite number.`, {
        code: "INVALID_CONFIG",
        path: `layout.breakpoints.${name}`,
        details: { received: width }
      });
    }
    resolved[name] = width;
  }
  for (let index = 1; index < BREAKPOINT_ORDER.length; index += 1) {
    const previous = BREAKPOINT_ORDER[index - 1] as DashboardBreakpoint;
    const current = BREAKPOINT_ORDER[index] as DashboardBreakpoint;
    if (resolved[current] <= resolved[previous]) {
      throw new NumvizError(
        "`layout.breakpoints` must increase from sm to md to lg to xl.",
        {
          code: "INVALID_CONFIG",
          path: "layout.breakpoints",
          details: { [previous]: resolved[previous], [current]: resolved[current] }
        }
      );
    }
  }
  return resolved;
}

function resolveLayout(value: DashboardLayout | undefined): ResolvedDashboardLayout {
  if (value !== undefined && !isPlainObject(value)) {
    throw new NumvizError("`layout` must be an object.", {
      code: "INVALID_CONFIG",
      path: "layout"
    });
  }
  const layout = (value ?? {}) as DashboardLayout;
  const gap = resolveCssLength(layout.gap, "layout.gap", "16px");
  const rowGap = resolveCssLength(layout.rowGap, "layout.rowGap", gap);
  const padding = resolveCssLength(layout.padding, "layout.padding", "0px");
  let rows: string | undefined;
  if (typeof layout.rows === "number") {
    rows = `repeat(${requireInteger(layout.rows, "layout.rows", 1, 24)}, minmax(0, 1fr))`;
  } else if (layout.rows !== undefined) {
    rows = resolveCssLength(layout.rows, "layout.rows", "auto");
  }
  const autoRows =
    layout.autoRows === undefined
      ? undefined
      : resolveCssLength(layout.autoRows, "layout.autoRows", "auto");
  const align = layout.align ?? "stretch";
  if (!ALIGNMENTS.includes(align)) {
    throw new NumvizError(`\`layout.align\` must be one of: ${ALIGNMENTS.join(", ")}.`, {
      code: "INVALID_CONFIG",
      path: "layout.align",
      details: { received: align }
    });
  }
  const variant = layout.variant ?? "default";
  if (!VARIANTS.includes(variant)) {
    throw new NumvizError(`\`layout.variant\` must be one of: ${VARIANTS.join(", ")}.`, {
      code: "INVALID_CONFIG",
      path: "layout.variant",
      details: { received: variant }
    });
  }
  return {
    columns: resolveColumns(layout.columns),
    ...(rows !== undefined ? { rows } : {}),
    ...(autoRows !== undefined ? { autoRows } : {}),
    breakpoints: resolveBreakpoints(layout.breakpoints),
    gap,
    rowGap,
    padding,
    align,
    variant
  };
}

function resolveWidgetStyle(
  value: DashboardWidgetStyle | undefined,
  path: string
): DashboardWidgetStyle {
  if (value === undefined) return {};
  if (!isPlainObject(value)) {
    throw new NumvizError(`\`${path}\` must be an object.`, {
      code: "INVALID_CONFIG",
      path
    });
  }
  const style = value as DashboardWidgetStyle;
  const background = optionalString(style.background, `${path}.background`);
  const border = optionalString(style.border, `${path}.border`);
  const className = optionalString(style.className, `${path}.className`);
  const borderRadius =
    style.borderRadius === undefined
      ? undefined
      : resolveCssLength(style.borderRadius, `${path}.borderRadius`, "0px");
  const padding =
    style.padding === undefined
      ? undefined
      : resolveCssLength(style.padding, `${path}.padding`, "0px");
  if (style.boxShadow !== undefined && !SHADOWS.includes(style.boxShadow)) {
    throw new NumvizError(`\`${path}.boxShadow\` must be one of: ${SHADOWS.join(", ")}.`, {
      code: "INVALID_CONFIG",
      path: `${path}.boxShadow`,
      details: { received: style.boxShadow }
    });
  }
  return {
    ...(background !== undefined ? { background } : {}),
    ...(border !== undefined ? { border } : {}),
    ...(borderRadius !== undefined ? { borderRadius } : {}),
    ...(padding !== undefined ? { padding } : {}),
    ...(style.boxShadow !== undefined ? { boxShadow: style.boxShadow } : {}),
    ...(className !== undefined ? { className } : {})
  };
}

function resolveComponentLayout(
  value: DashboardComponentLayout | undefined,
  path: string
): DashboardComponentLayout | undefined {
  if (value === undefined) return undefined;
  if (!isPlainObject(value)) {
    throw new NumvizError(`\`${path}\` must be an object.`, {
      code: "INVALID_CONFIG",
      path
    });
  }
  const layout = value as DashboardComponentLayout;
  const column =
    layout.column === undefined
      ? undefined
      : requireInteger(layout.column, `${path}.column`, 1);
  const row =
    layout.row === undefined ? undefined : requireInteger(layout.row, `${path}.row`, 1);
  const columnSpan =
    layout.columnSpan === undefined
      ? undefined
      : requireInteger(layout.columnSpan, `${path}.columnSpan`, 1, 12);
  const rowSpan =
    layout.rowSpan === undefined
      ? undefined
      : requireInteger(layout.rowSpan, `${path}.rowSpan`, 1);
  if (
    layout.order !== undefined &&
    (typeof layout.order !== "number" || !Number.isFinite(layout.order))
  ) {
    throw new NumvizError(`\`${path}.order\` must be a finite number.`, {
      code: "INVALID_CONFIG",
      path: `${path}.order`,
      details: { received: layout.order }
    });
  }
  if (layout.align !== undefined && !ALIGNMENTS.includes(layout.align)) {
    throw new NumvizError(`\`${path}.align\` must be one of: ${ALIGNMENTS.join(", ")}.`, {
      code: "INVALID_CONFIG",
      path: `${path}.align`,
      details: { received: layout.align }
    });
  }
  const width =
    layout.width === undefined
      ? undefined
      : resolveCssLength(layout.width, `${path}.width`, "0px");
  const height =
    layout.height === undefined
      ? undefined
      : resolveCssLength(layout.height, `${path}.height`, "0px");
  const minWidth =
    layout.minWidth === undefined
      ? undefined
      : resolveCssLength(layout.minWidth, `${path}.minWidth`, "0px");
  const minHeight =
    layout.minHeight === undefined
      ? undefined
      : resolveCssLength(layout.minHeight, `${path}.minHeight`, "0px");
  return {
    ...(column !== undefined ? { column } : {}),
    ...(row !== undefined ? { row } : {}),
    ...(columnSpan !== undefined ? { columnSpan } : {}),
    ...(rowSpan !== undefined ? { rowSpan } : {}),
    ...(layout.order !== undefined ? { order: layout.order } : {}),
    ...(width !== undefined ? { width } : {}),
    ...(height !== undefined ? { height } : {}),
    ...(minWidth !== undefined ? { minWidth } : {}),
    ...(minHeight !== undefined ? { minHeight } : {}),
    ...(layout.align !== undefined ? { align: layout.align } : {})
  };
}

function resolveCrossFilter(value: unknown, path: string): DashboardCrossFilterConfig | undefined {
  if (value === undefined) return undefined;
  if (!isPlainObject(value)) {
    throw new NumvizError(`\`${path}\` must be an object.`, {
      code: "INVALID_CONFIG",
      path
    });
  }
  const crossFilter = value as DashboardCrossFilterConfig;
  const field = optionalString(crossFilter.field, `${path}.field`);
  let targets: readonly string[] | undefined;
  if (crossFilter.targets !== undefined) {
    if (!Array.isArray(crossFilter.targets)) {
      throw new NumvizError(`\`${path}.targets\` must be an array of widget ids.`, {
        code: "INVALID_CONFIG",
        path: `${path}.targets`
      });
    }
    targets = [
      ...new Set(
        crossFilter.targets.map((target, index) =>
          requireNonEmptyString(target, `${path}.targets[${index}]`)
        )
      )
    ];
  }
  if (crossFilter.includeSelf !== undefined && typeof crossFilter.includeSelf !== "boolean") {
    throw new NumvizError(`\`${path}.includeSelf\` must be a boolean.`, {
      code: "INVALID_CONFIG",
      path: `${path}.includeSelf`
    });
  }
  if (crossFilter.multi !== undefined && typeof crossFilter.multi !== "boolean") {
    throw new NumvizError(`\`${path}.multi\` must be a boolean.`, {
      code: "INVALID_CONFIG",
      path: `${path}.multi`
    });
  }
  return {
    ...(field !== undefined ? { field } : {}),
    ...(targets !== undefined ? { targets } : {}),
    ...(crossFilter.includeSelf !== undefined ? { includeSelf: crossFilter.includeSelf } : {}),
    ...(crossFilter.multi !== undefined ? { multi: crossFilter.multi } : {})
  };
}

function validateComponent(component: unknown, index: number): DashboardComponent {
  const path = `components[${index}]`;
  if (!isPlainObject(component)) {
    throw new NumvizError(`\`${path}\` must be an object.`, {
      code: "INVALID_CONFIG",
      path
    });
  }
  const candidate = component as Record<string, unknown>;
  const type = candidate.type;
  if (typeof type !== "string" || !COMPONENT_TYPES.includes(type as (typeof COMPONENT_TYPES)[number])) {
    throw new NumvizError(
      `\`${path}.type\` must be one of: ${COMPONENT_TYPES.join(", ")}.`,
      { code: "INVALID_CONFIG", path: `${path}.type`, details: { received: type } }
    );
  }
  const id = requireNonEmptyString(candidate.id, `${path}.id`).trim();
  const title = optionalString(candidate.title, `${path}.title`);
  const ariaLabel = optionalString(candidate.ariaLabel, `${path}.ariaLabel`);
  const layout = resolveComponentLayout(
    candidate.layout as DashboardComponentLayout | undefined,
    `${path}.layout`
  );
  const style = resolveWidgetStyle(
    candidate.style as DashboardWidgetStyle | undefined,
    `${path}.style`
  );
  if (candidate.visible !== undefined && typeof candidate.visible !== "boolean") {
    throw new NumvizError(`\`${path}.visible\` must be a boolean.`, {
      code: "INVALID_CONFIG",
      path: `${path}.visible`
    });
  }
  const crossFilter = resolveCrossFilter(candidate.crossFilter, `${path}.crossFilter`);

  if (type === "heading") {
    const text = requireNonEmptyString(candidate.text, `${path}.text`);
    const level = candidate.level === undefined ? 2 : candidate.level;
    if (
      typeof level !== "number" ||
      !Number.isInteger(level) ||
      level < 1 ||
      level > 6
    ) {
      throw new NumvizError(`\`${path}.level\` must be an integer from 1 to 6.`, {
        code: "INVALID_CONFIG",
        path: `${path}.level`,
        details: { received: level }
      });
    }
    return {
      ...(candidate as unknown as Record<string, unknown>),
      id,
      text,
      level: level as 1 | 2 | 3 | 4 | 5 | 6,
      title,
      ariaLabel,
      layout,
      style,
      ...(candidate.visible !== undefined ? { visible: candidate.visible } : {}),
      ...(crossFilter !== undefined ? { crossFilter } : {})
    } as unknown as DashboardComponent;
  }
  if (type === "text" || type === "description") {
    const text = requireNonEmptyString(candidate.text, `${path}.text`);
    return {
      ...(candidate as unknown as Record<string, unknown>),
      id,
      text,
      title,
      ariaLabel,
      layout,
      style,
      ...(candidate.visible !== undefined ? { visible: candidate.visible } : {}),
      ...(crossFilter !== undefined ? { crossFilter } : {})
    } as unknown as DashboardComponent;
  }
  if (type === "divider") {
    return {
      ...(candidate as unknown as Record<string, unknown>),
      id,
      title,
      ariaLabel,
      layout,
      style,
      ...(candidate.visible !== undefined ? { visible: candidate.visible } : {}),
      ...(crossFilter !== undefined ? { crossFilter } : {})
    } as unknown as DashboardComponent;
  }
  if (type === "image") {
    const src = requireNonEmptyString(candidate.src, `${path}.src`);
    if (typeof candidate.alt !== "string") {
      throw new NumvizError(`\`${path}.alt\` must be a string.`, {
        code: "INVALID_CONFIG",
        path: `${path}.alt`,
        details: { received: typeof candidate.alt }
      });
    }
    const fit = candidate.fit ?? "cover";
    if (!IMAGE_FITS.includes(fit as DashboardImageFit)) {
      throw new NumvizError(`\`${path}.fit\` must be one of: ${IMAGE_FITS.join(", ")}.`, {
        code: "INVALID_CONFIG",
        path: `${path}.fit`,
        details: { received: fit }
      });
    }
    const width =
      candidate.width === undefined
        ? undefined
        : resolveCssLength(candidate.width, `${path}.width`, "0px");
    const height =
      candidate.height === undefined
        ? undefined
        : resolveCssLength(candidate.height, `${path}.height`, "0px");
    const caption =
      candidate.caption === undefined
        ? undefined
        : requireNonEmptyString(candidate.caption, `${path}.caption`);
    return {
      ...(candidate as unknown as Record<string, unknown>),
      id,
      src,
      alt: candidate.alt,
      fit: fit as DashboardImageFit,
      ...(width !== undefined ? { width } : {}),
      ...(height !== undefined ? { height } : {}),
      ...(caption !== undefined ? { caption } : {}),
      title,
      ariaLabel,
      layout,
      style,
      ...(candidate.visible !== undefined ? { visible: candidate.visible } : {}),
      ...(crossFilter !== undefined ? { crossFilter } : {})
    } as unknown as DashboardComponent;
  }
  if (type === "custom") {
    if (typeof candidate.render !== "function") {
      throw new NumvizError(`\`${path}.render\` must be a function.`, {
        code: "INVALID_CONFIG",
        path: `${path}.render`,
        details: { received: typeof candidate.render }
      });
    }
    if (candidate.destroy !== undefined && typeof candidate.destroy !== "function") {
      throw new NumvizError(`\`${path}.destroy\` must be a function.`, {
        code: "INVALID_CONFIG",
        path: `${path}.destroy`,
        details: { received: typeof candidate.destroy }
      });
    }
    return {
      ...(candidate as unknown as Record<string, unknown>),
      id,
      title,
      ariaLabel,
      layout,
      style,
      ...(candidate.visible !== undefined ? { visible: candidate.visible } : {}),
      ...(crossFilter !== undefined ? { crossFilter } : {})
    } as unknown as DashboardComponent;
  }
  return {
    ...(candidate as unknown as Record<string, unknown>),
    id,
    title,
    ariaLabel,
    layout,
    style,
    ...(candidate.visible !== undefined ? { visible: candidate.visible } : {}),
    ...(crossFilter !== undefined ? { crossFilter } : {})
  } as unknown as DashboardComponent;
}

function resolveHeader(
  config: DashboardConfig,
  value: DashboardHeaderConfig | string | false | undefined
): ResolvedDashboardHeader | null {
  if (value === false) return null;
  if (typeof value === "string") {
    return { text: requireNonEmptyString(value, "header") };
  }
  if (value !== undefined && !isPlainObject(value)) {
    throw new NumvizError("`header` must be an object, string or false.", {
      code: "INVALID_CONFIG",
      path: "header"
    });
  }
  const header = (value ?? {}) as DashboardHeaderConfig;
  const title = optionalString(header.title, "header.title") ?? optionalString(config.title, "title");
  const description =
    optionalString(header.description, "header.description") ??
    optionalString(config.description, "description");
  const text = optionalString(header.text, "header.text");
  const logo = optionalString(header.logo, "header.logo");
  const className = optionalString(header.className, "header.className");
  if (
    title === undefined &&
    description === undefined &&
    text === undefined &&
    logo === undefined
  ) {
    return null;
  }
  return {
    ...(title !== undefined ? { title } : {}),
    ...(description !== undefined ? { description } : {}),
    ...(text !== undefined ? { text } : {}),
    ...(logo !== undefined ? { logo } : {}),
    ...(className !== undefined ? { className } : {})
  };
}

function resolveFooter(
  value: DashboardFooterConfig | string | false | undefined
): ResolvedDashboardFooter | null {
  if (value === false || value === undefined) return null;
  if (typeof value === "string") {
    return { text: requireNonEmptyString(value, "footer") };
  }
  if (!isPlainObject(value)) {
    throw new NumvizError("`footer` must be an object, string or false.", {
      code: "INVALID_CONFIG",
      path: "footer"
    });
  }
  const footer = value as DashboardFooterConfig;
  const text = optionalString(footer.text, "footer.text");
  if (text === undefined) return null;
  const className = optionalString(footer.className, "footer.className");
  return { text, ...(className !== undefined ? { className } : {}) };
}

function resolvePrint(value: DashboardConfig["print"]): DashboardPrintOptions | null {
  if (value === false) return null;
  if (value === undefined) return { hideFilters: true, pageBreak: "avoid" };
  if (!isPlainObject(value)) {
    throw new NumvizError("`print` must be a boolean or an object.", {
      code: "INVALID_CONFIG",
      path: "print"
    });
  }
  const bool = (field: "hideFilters" | "hideHeader" | "hideFooter"): boolean | undefined => {
    const input = value[field];
    if (input === undefined) return undefined;
    if (typeof input !== "boolean") {
      throw new NumvizError(`\`print.${field}\` must be a boolean.`, {
        code: "INVALID_CONFIG",
        path: `print.${field}`
      });
    }
    return input;
  };
  const pageBreak = value.pageBreak;
  if (pageBreak !== undefined && pageBreak !== "auto" && pageBreak !== "avoid") {
    throw new NumvizError('`print.pageBreak` must be "auto" or "avoid".', {
      code: "INVALID_CONFIG",
      path: "print.pageBreak"
    });
  }
  const hideFilters = bool("hideFilters");
  const hideHeader = bool("hideHeader");
  const hideFooter = bool("hideFooter");
  return {
    hideFilters: hideFilters ?? true,
    ...(hideHeader !== undefined ? { hideHeader } : {}),
    ...(hideFooter !== undefined ? { hideFooter } : {}),
    pageBreak: pageBreak ?? "avoid"
  };
}

function resolveFormat(value: DashboardConfig["format"]): ResolvedDashboardFormat {
  if (value === undefined) return {};
  if (!isPlainObject(value)) {
    throw new NumvizError("`format` must be an object.", {
      code: "INVALID_CONFIG",
      path: "format"
    });
  }
  const locale = optionalString(value.locale, "format.locale");
  const currency = optionalString(value.currency, "format.currency");
  return {
    ...(locale !== undefined ? { locale } : {}),
    ...(currency !== undefined ? { currency } : {})
  };
}

/** Validate a dashboard configuration and apply layout defaults. */
export function resolveDashboard(config: DashboardConfig): ResolvedDashboardConfig {
  if (!isPlainObject(config)) {
    throw new NumvizError("`createDashboard` requires a configuration object.", {
      code: "INVALID_CONFIG"
    });
  }
  if (!Array.isArray(config.components)) {
    throw new NumvizError("`components` must be an array.", {
      code: "INVALID_CONFIG",
      path: "components",
      details: { received: typeof config.components }
    });
  }
  const components = config.components.map((component, index) =>
    validateComponent(component, index)
  );
  const ids = new Set<string>();
  for (const component of components) {
    if (ids.has(component.id)) {
      throw new NumvizError(`Duplicate dashboard component id "${component.id}".`, {
        code: "INVALID_CONFIG",
        path: `components.${component.id}.id`,
        details: { id: component.id }
      });
    }
    ids.add(component.id);
  }
  const theme = resolveThemeConfig(config.theme) as ThemeConfig;
  return {
    components,
    theme,
    ...(optionalString(config.title, "title") !== undefined
      ? { title: config.title }
      : {}),
    ...(optionalString(config.description, "description") !== undefined
      ? { description: config.description }
      : {}),
    ...(optionalString(config.background, "background") !== undefined
      ? { background: config.background }
      : {}),
    ...(optionalString(config.className, "className") !== undefined
      ? { className: config.className }
      : {}),
    layout: resolveLayout(config.layout),
    header: resolveHeader(config, config.header),
    footer: resolveFooter(config.footer),
    format: resolveFormat(config.format),
    widgetStyle: resolveWidgetStyle(config.widgetStyle, "widgetStyle"),
    filters: resolveFilters(config.filters),
    print: resolvePrint(config.print)
  };
}
