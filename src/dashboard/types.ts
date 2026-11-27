import type { Metric, MetricConfig } from "../metric/types.js";
import type { Table, TableConfig } from "../table/types.js";
import type {
  Chart,
  ChartClickEvent,
  ChartConfig,
  ChartType,
  ColumnInput,
  DataInput,
  NormalizedRow,
  ThemeConfig
} from "../types.js";

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

/** Built-in dashboard filter controls. */
export type DashboardFilterType =
  | "select"
  | "multi-select"
  | "search"
  | "date-range"
  | "number-range"
  | "custom";

/** Inclusive range used by date and number filters. */
export interface DashboardFilterRange {
  readonly from?: string | number | null;
  readonly to?: string | number | null;
}

/** A value held by a dashboard filter. */
export type DashboardFilterValue =
  | string
  | number
  | boolean
  | null
  | DashboardFilterRange
  | readonly (string | number | boolean)[];

/** One option in a select or multi-select filter. */
export interface DashboardFilterOption {
  readonly label: string;
  readonly value: string | number | boolean;
}

/** Context passed to a custom filter renderer. */
export interface DashboardFilterRenderContext {
  readonly id: string;
  readonly document: Document;
  readonly dashboard: Dashboard;
  readonly filter: DashboardCustomFilter;
  readonly value: DashboardFilterValue;
  readonly setValue: (value: DashboardFilterValue) => void;
}

/** Context passed to a custom filter predicate. */
export interface DashboardFilterRowContext {
  readonly id: string;
  readonly values: Readonly<Record<string, unknown>>;
  readonly row: NormalizedRow;
}

/** Fields shared by every dashboard filter. */
export interface DashboardFilterBase {
  /** Unique filter identifier. */
  readonly id: string;
  /** Field used to evaluate the filter. Omit for search across all fields. */
  readonly field?: string;
  /** Visible control label. Defaults to the id. */
  readonly label?: string;
  /** Placeholder for text and range controls. */
  readonly placeholder?: string;
  /** Widget ids this filter applies to. Defaults to every widget with the field. */
  readonly targets?: readonly string[];
  /** Initial filter value. */
  readonly defaultValue?: DashboardFilterValue;
  /** Extra class on the filter field wrapper. */
  readonly className?: string;
}

export interface DashboardSelectFilter extends DashboardFilterBase {
  readonly type: "select" | "multi-select";
  /** Options may be objects or primitive values. */
  readonly options?: readonly (DashboardFilterOption | string | number | boolean)[];
  /** Allow several values in a `select` filter. */
  readonly multi?: boolean;
}

export interface DashboardSearchFilter extends DashboardFilterBase {
  readonly type: "search";
}

export interface DashboardDateRangeFilter extends DashboardFilterBase {
  readonly type: "date-range";
  readonly min?: string;
  readonly max?: string;
}

export interface DashboardNumberRangeFilter extends DashboardFilterBase {
  readonly type: "number-range";
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
}

export interface DashboardCustomFilter extends DashboardFilterBase {
  readonly type: "custom";
  /** Renders the control. Returned strings are inserted as text. */
  readonly render: (context: DashboardFilterRenderContext) => Node | string | null;
  /** Optional predicate used to apply the custom value to rows. */
  readonly matches?: (row: DashboardFilterRowContext, value: DashboardFilterValue) => boolean;
}

/** A dashboard filter declaration. */
export type DashboardFilter =
  | DashboardSelectFilter
  | DashboardSearchFilter
  | DashboardDateRangeFilter
  | DashboardNumberRangeFilter
  | DashboardCustomFilter;

/** Filter declaration with normalized options and defaults. */
export interface ResolvedDashboardFilter {
  readonly id: string;
  readonly type: DashboardFilterType;
  readonly field?: string;
  readonly label: string;
  readonly placeholder?: string;
  readonly targets?: readonly string[];
  readonly defaultValue: DashboardFilterValue;
  readonly className?: string;
  readonly options: readonly DashboardFilterOption[];
  readonly multi: boolean;
  readonly min?: string | number;
  readonly max?: string | number;
  readonly step?: number;
  readonly render?: DashboardCustomFilter["render"];
  readonly matches?: DashboardCustomFilter["matches"];
  /** Widget that created an automatic cross-filter. */
  readonly source?: string;
  readonly includeSelf?: boolean;
}

/** Configurable cross-filter created by a chart or table interaction. */
export interface DashboardCrossFilterConfig {
  /** Field used for the filter. Defaults to the chart X field or table first column. */
  readonly field?: string;
  /** Widget ids to filter. Defaults to every compatible widget except the source. */
  readonly targets?: readonly string[];
  /** Include the source widget in its own filter. Defaults to false. */
  readonly includeSelf?: boolean;
  /** Keep several selected values instead of replacing the filter. */
  readonly multi?: boolean;
}

/** Serialized cross-filter created by an interaction. */
export interface DashboardCrossFilterState extends DashboardCrossFilterConfig {
  readonly id: string;
  readonly source: string;
  readonly field: string;
  readonly value: DashboardFilterValue;
}

/** State that can be serialized and restored. */
export interface DashboardState {
  readonly filters: Readonly<Record<string, DashboardFilterValue>>;
  readonly selections: Readonly<Record<string, readonly number[]>>;
  readonly visibleComponents: Readonly<Record<string, boolean>>;
  readonly crossFilters?: Readonly<Record<string, DashboardCrossFilterState>>;
}

/** A partial state update accepted by {@link Dashboard.setState}. */
export type DashboardStateUpdate = Partial<DashboardState>;

/** Events emitted by a dashboard. */
export type DashboardEventType =
  | "filterchange"
  | "selectionchange"
  | "widgetclick"
  | "statechange";

export interface DashboardFilterChangeEvent {
  readonly type: "filterchange";
  readonly id: string;
  readonly value: DashboardFilterValue;
  readonly filters: Readonly<Record<string, DashboardFilterValue>>;
  readonly source?: string;
}

export interface DashboardSelectionChangeEvent {
  readonly type: "selectionchange";
  readonly id: string;
  readonly indices: readonly number[];
  readonly source?: string;
}

export interface DashboardWidgetClickEvent {
  readonly type: "widgetclick";
  readonly id: string;
  readonly event: ChartClickEvent;
}

export interface DashboardStateChangeEvent {
  readonly type: "statechange";
  readonly state: DashboardState;
}

export interface DashboardEventMap {
  readonly filterchange: DashboardFilterChangeEvent;
  readonly selectionchange: DashboardSelectionChangeEvent;
  readonly widgetclick: DashboardWidgetClickEvent;
  readonly statechange: DashboardStateChangeEvent;
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
  /** Initial visibility. Toggle later through dashboard state. */
  readonly visible?: boolean;
  /** Turn chart clicks or table selections into dashboard filters. */
  readonly crossFilter?: DashboardCrossFilterConfig;
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
  readonly logo?: string;
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
  /** Filter controls shown above the dashboard grid. */
  readonly filters?: readonly DashboardFilter[];
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
  readonly logo?: string;
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
  readonly filters: readonly ResolvedDashboardFilter[];
  readonly className?: string;
}

/** Output format supported by {@link Dashboard.export}. */
export type DashboardExportFormat = "html";

/** How a generated dashboard stores its component data. */
export type DashboardDataMode = "embedded" | "external";

/** Options for generating a standalone dashboard project. */
export interface DashboardExportOptions {
  /** Output format. Only HTML is currently supported. */
  readonly format?: DashboardExportFormat;
  /**
   * Directory to create, or a `.html` path for a single-file dashboard.
   * Relative paths resolve from the current working directory.
   */
  readonly output: string;
  /** Embed data in the page or write `data/data.json`. Defaults to embedded. */
  readonly data?: DashboardDataMode;
  /** Override the generated dashboard title. */
  readonly title?: string;
  /** Override the generated dashboard description. */
  readonly description?: string;
  /** Logo URL or data URI shown in the dashboard header. */
  readonly logo?: string;
  /** Override the dashboard theme. */
  readonly theme?: ThemeConfig;
  /** Override the page and dashboard background. */
  readonly background?: string;
  /** Override the dashboard grid layout. */
  readonly layout?: DashboardLayout;
  /** Convenience font override, equivalent to `theme.fontFamily`. */
  readonly fontFamily?: string;
  /** Override the generated header, or pass `false` to hide it. */
  readonly header?: DashboardHeaderConfig | string | false;
  /** Override the generated footer, or pass `false` to hide it. */
  readonly footer?: DashboardFooterConfig | string | false;
}

/** One file written by {@link Dashboard.export}. */
export interface DashboardExportFile {
  /** Path relative to the output directory, or the file name for single-file output. */
  readonly path: string;
  readonly bytes: number;
}

/** Result returned by {@link Dashboard.export}. */
export interface DashboardExportResult {
  readonly format: DashboardExportFormat;
  /** Absolute output path. */
  readonly output: string;
  readonly singleFile: boolean;
  readonly data: DashboardDataMode;
  readonly files: readonly DashboardExportFile[];
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
  /** Read the current filter value, or `null` when it is not set. */
  getFilter(id: string): DashboardFilterValue;
  /** Replace one filter value and update connected widgets. */
  setFilter(id: string, value: DashboardFilterValue): Dashboard;
  /** Clear one filter. */
  clearFilter(id: string): Dashboard;
  /** Clear every configured and cross-filter. */
  clearFilters(): Dashboard;
  /** Read selected row or point indices for one widget. */
  getSelection(id: string): readonly number[];
  /** Replace selected row or point indices for one widget. */
  setSelection(id: string, indices: readonly number[], emit?: boolean): Dashboard;
  /** Show or hide one widget. */
  setComponentVisible(id: string, visible: boolean): Dashboard;
  /** Serialize filters, selections and widget visibility. */
  getState(): DashboardState;
  /** Restore a partial serialized state. */
  setState(state: DashboardStateUpdate): Dashboard;
  /** Replace one widget's data without rebuilding the dashboard. */
  setWidgetData(id: string, data: DataInput, columns?: readonly ColumnInput[]): Dashboard;
  /** Merge a partial component configuration into one widget. */
  updateWidget(id: string, patch: Partial<DashboardComponent>): Dashboard;
  /** Subscribe to a dashboard event. Returns an unsubscribe function. */
  on<K extends DashboardEventType>(
    type: K,
    listener: (event: DashboardEventMap[K]) => void
  ): () => void;
  /** Remove an event listener. */
  off<K extends DashboardEventType>(
    type: K,
    listener: (event: DashboardEventMap[K]) => void
  ): void;
  /**
   * Generate a standalone HTML dashboard that does not require Numviz or a
   * framework at runtime. Requires Node.js filesystem access.
   */
  export(options: DashboardExportOptions): Promise<DashboardExportResult>;
  destroy(): void;
}
