import type { Metric, MetricConfig } from "../metric/types.js";
import type { Table, TableConfig } from "../table/types.js";
import type { Chart, ChartConfig, ChartType, ThemeConfig } from "../types.js";

/** Responsive breakpoint names used by dashboard grids. */
export type DashboardBreakpoint = "sm" | "md" | "lg" | "xl";

/** Minimum viewport widths for responsive dashboard columns. */
export interface DashboardBreakpoints {
  readonly sm?: number;
  readonly md?: number;
  readonly lg?: number;
  readonly xl?: number;
}

/** Column counts at each dashboard breakpoint. */
export interface DashboardColumns {
  readonly base?: number;
  readonly sm?: number;
  readonly md?: number;
  readonly lg?: number;
  readonly xl?: number;
}

/** Alignment of widgets inside the dashboard grid. */
export type DashboardAlignment = "start" | "center" | "end" | "stretch";

/** Visual variants for the dashboard frame and widget surfaces. */
export type DashboardVariant = "default" | "compact" | "flush";

/** Shadow presets for dashboard widgets. */
export type DashboardWidgetShadow = "none" | "sm" | "md" | "lg";

/** Per-widget visual overrides. These do not affect grid layout. */
export interface DashboardWidgetStyle {
  readonly background?: string;
  readonly border?: string;
  readonly borderRadius?: number | string;
  readonly padding?: number | string;
  readonly boxShadow?: DashboardWidgetShadow;
  readonly className?: string;
}

/** Grid placement and sizing for one dashboard widget. */
export interface DashboardComponentLayout {
  /** One-based column start. */
  readonly column?: number;
  /** One-based row start. */
  readonly row?: number;
  readonly columnSpan?: number;
  readonly rowSpan?: number;
  readonly order?: number;
  readonly width?: number | string;
  readonly height?: number | string;
  readonly minWidth?: number | string;
  readonly minHeight?: number | string;
  readonly align?: DashboardAlignment;
}

/** Fields shared by every dashboard component. */
export interface DashboardWidgetBase {
  /** Unique component identifier, used for updates and lookup. */
  readonly id: string;
  readonly title?: string;
  readonly ariaLabel?: string;
  readonly layout?: DashboardComponentLayout;
  readonly style?: DashboardWidgetStyle;
}

export type DashboardChartComponent = DashboardWidgetBase &
  Omit<ChartConfig, "type"> & {
    readonly type: "chart";
    readonly chartType: ChartType;
  };

export type DashboardTableComponent = DashboardWidgetBase &
  TableConfig & {
    readonly type: "table";
  };

export type DashboardMetricComponent = DashboardWidgetBase &
  Omit<MetricConfig, "name"> & {
    readonly type: "metric";
    /** Metric label. Falls back to `title`, then the component id. */
    readonly name?: string;
  };

export type DashboardHeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export type DashboardHeadingComponent = DashboardWidgetBase & {
  readonly type: "heading";
  readonly text: string;
  readonly level?: DashboardHeadingLevel;
};

export type DashboardTextComponent = DashboardWidgetBase & {
  readonly type: "text";
  readonly text: string;
};

export type DashboardDescriptionComponent = DashboardWidgetBase & {
  readonly type: "description";
  readonly text: string;
};

export type DashboardDividerComponent = DashboardWidgetBase & {
  readonly type: "divider";
};

export type DashboardImageFit = "cover" | "contain";

export type DashboardImageComponent = DashboardWidgetBase & {
  readonly type: "image";
  readonly src: string;
  readonly alt: string;
  readonly width?: number | string;
  readonly height?: number | string;
  readonly fit?: DashboardImageFit;
  readonly caption?: string;
};

/** Context available to an explicit custom dashboard component. */
export interface DashboardCustomRenderContext {
  readonly id: string;
  readonly document: Document;
  readonly dashboard: Dashboard;
  readonly component: DashboardCustomComponent;
}

/**
 * Safe custom component extension. The callback returns a DOM node or plain
 * text; Numviz never parses an HTML string returned by a custom component.
 */
export type DashboardCustomComponent = DashboardWidgetBase & {
  readonly type: "custom";
  readonly render: (context: DashboardCustomRenderContext) => Node | string | null;
  readonly destroy?: () => void;
};

export type DashboardComponent =
  | DashboardChartComponent
  | DashboardTableComponent
  | DashboardMetricComponent
  | DashboardHeadingComponent
  | DashboardTextComponent
  | DashboardDescriptionComponent
  | DashboardDividerComponent
  | DashboardImageComponent
  | DashboardCustomComponent;

/** Dashboard header text overrides. Use `false` to hide the header. */
export interface DashboardHeaderConfig {
  readonly title?: string;
  readonly description?: string;
  readonly text?: string;
  readonly className?: string;
}

/** Dashboard footer text. Use `false` to hide the footer. */
export interface DashboardFooterConfig {
  readonly text?: string;
  readonly className?: string;
}

/** Global number and currency defaults for metrics and tables. */
export interface DashboardFormatConfig {
  readonly locale?: string;
  readonly currency?: string;
}

/** Responsive grid configuration. */
export interface DashboardLayout {
  readonly columns?: number | DashboardColumns;
  readonly rows?: number | string;
  readonly autoRows?: number | string;
  readonly breakpoints?: DashboardBreakpoints;
  readonly gap?: number | string;
  readonly rowGap?: number | string;
  readonly padding?: number | string;
  readonly align?: DashboardAlignment;
  readonly variant?: DashboardVariant;
}

/** Dashboard configuration accepted by {@link createDashboard}. */
export interface DashboardConfig {
  readonly title?: string;
  readonly description?: string;
  readonly components: readonly DashboardComponent[];
  readonly theme?: ThemeConfig;
  readonly background?: string;
  readonly layout?: DashboardLayout;
  readonly header?: DashboardHeaderConfig | string | false;
  readonly footer?: DashboardFooterConfig | string | false;
  readonly format?: DashboardFormatConfig;
  readonly widgetStyle?: DashboardWidgetStyle;
  readonly className?: string;
}

/** Layout with defaults and inherited breakpoint columns applied. */
export interface ResolvedDashboardLayout {
  readonly columns: Required<DashboardColumns>;
  readonly rows?: string;
  readonly autoRows?: string;
  readonly breakpoints: Required<DashboardBreakpoints>;
  readonly gap: string;
  readonly rowGap: string;
  readonly padding: string;
  readonly align: DashboardAlignment;
  readonly variant: DashboardVariant;
}

export interface ResolvedDashboardHeader {
  readonly title?: string;
  readonly description?: string;
  readonly text?: string;
  readonly className?: string;
}

export interface ResolvedDashboardFooter {
  readonly text: string;
  readonly className?: string;
}

export interface ResolvedDashboardFormat {
  readonly locale?: string;
  readonly currency?: string;
}

/** Dashboard configuration after validation and layout defaults. */
export interface ResolvedDashboardConfig {
  readonly title?: string;
  readonly description?: string;
  readonly components: readonly DashboardComponent[];
  readonly theme: ThemeConfig;
  readonly background?: string;
  readonly layout: ResolvedDashboardLayout;
  readonly header: ResolvedDashboardHeader | null;
  readonly footer: ResolvedDashboardFooter | null;
  readonly format: ResolvedDashboardFormat;
  readonly widgetStyle: DashboardWidgetStyle;
  readonly className?: string;
}

/** Public handle for a rendered dashboard child. */
export interface DashboardWidget {
  readonly id: string;
  readonly type: DashboardComponent["type"];
  readonly component: DashboardComponent;
  readonly instance: Chart | Table | Metric | null;
  readonly element: HTMLElement | null;
}

/** A dashboard instance created by {@link createDashboard}. */
export interface Dashboard {
  readonly config: ResolvedDashboardConfig;
  readonly widgets: readonly DashboardWidget[];
  readonly element: HTMLElement | null;
  readonly isDestroyed: boolean;
  /** Render the dashboard into a selector or element. */
  render(target: string | Element): Dashboard;
  /** Replace the configuration and reconcile existing widget engines. */
  update(config: DashboardConfig): Dashboard;
  /** Recompute and re-render against the current configuration. */
  refresh(): Dashboard;
  /** Look up a widget by component id. */
  getWidget(id: string): DashboardWidget | null;
  destroy(): void;
}
