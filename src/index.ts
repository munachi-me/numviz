import { createChart } from "./charts/createChart.js";
import { createDashboard } from "./dashboard/dashboard.js";
import { isNumvizError, NumvizError } from "./errors.js";
import { createMetric } from "./metric/metric.js";
import { createReport } from "./report/report.js";
import { createTable } from "./table/table.js";
import type { NumvizNamespace } from "./types.js";
import { VERSION } from "./version.js";

/**
 * Default Numviz namespace, built from the same function references as the
 * named exports. There is a single implementation behind both import styles.
 */
const Numviz: NumvizNamespace = Object.freeze({
  createChart,
  createTable,
  createMetric,
  createDashboard,
  createReport,
  version: VERSION,
  NumvizError
});

export { createChart, createTable, createMetric, createDashboard, createReport };
export { REPORT_PRESETS } from "./report/report.js";
export { NumvizError, isNumvizError };
export { VERSION as version };
export default Numviz;

export type {
  Chart,
  ChartClickEvent,
  ChartConfig,
  ChartType,
  ColumnDefinition,
  ColumnInput,
  ColumnType,
  DataInput,
  DataMatrixRow,
  DataRecord,
  DatasetLike,
  LabelConfig,
  LegendConfig,
  LegendPosition,
  AnimationConfig,
  AxisConfig,
  LabelPosition,
  MarginConfig,
  NormalizedColumn,
  NormalizedDataset,
  NormalizedRow,
  NormalizedValue,
  NumvizNamespace,
  ResolvedAxis,
  ResolvedChartConfig,
  ResolvedSeries,
  SeriesConfig,
  ThemeColors,
  ThemeConfig,
  ThemeMode,
  ThemeTokens,
  TickValue,
  TooltipConfig,
  TooltipContext,
  ValueFormatter
} from "./types.js";
export type {
  ResolvedTableColumn,
  ResolvedTableConfig,
  Table,
  TableAlign,
  TableCellContext,
  TableCellRenderer,
  TableColumnConfig,
  TableConfig,
  TableData,
  TableFormatPreset,
  TableFormatter,
  TableRow,
  TableSortDirection,
  TableSortState,
  TableState,
  TableVariant
} from "./table/types.js";
export type {
  Dashboard,
  DashboardAlignment,
  DashboardBreakpoint,
  DashboardBreakpoints,
  DashboardChartComponent,
  DashboardColumns,
  DashboardComponent,
  DashboardComponentLayout,
  DashboardConfig,
  DashboardCustomComponent,
  DashboardCustomRenderContext,
  DashboardDataMode,
  DashboardCrossFilterConfig,
  DashboardCrossFilterState,
  DashboardCustomFilter,
  DashboardDateRangeFilter,
  DashboardDescriptionComponent,
  DashboardDividerComponent,
  DashboardEventMap,
  DashboardEventType,
  DashboardExportFile,
  DashboardExportFormat,
  DashboardExportOptions,
  DashboardExportResult,
  DashboardFilter,
  DashboardFilterBase,
  DashboardFilterChangeEvent,
  DashboardFilterOption,
  DashboardFilterRange,
  DashboardFilterRenderContext,
  DashboardFilterRowContext,
  DashboardFilterType,
  DashboardFilterValue,
  DashboardFooterConfig,
  DashboardFormatConfig,
  DashboardHeaderConfig,
  DashboardHeadingComponent,
  DashboardHeadingLevel,
  DashboardImageComponent,
  DashboardImageFit,
  DashboardLayout,
  DashboardMetricComponent,
  DashboardPrintOptions,
  DashboardNumberRangeFilter,
  DashboardSearchFilter,
  DashboardSelectFilter,
  DashboardSelectionChangeEvent,
  DashboardState,
  DashboardStateChangeEvent,
  DashboardStateUpdate,
  DashboardTableComponent,
  DashboardTextComponent,
  DashboardVariant,
  DashboardWidget,
  DashboardWidgetBase,
  DashboardWidgetClickEvent,
  DashboardWidgetShadow,
  DashboardWidgetStyle,
  ResolvedDashboardConfig,
  ResolvedDashboardFilter,
  ResolvedDashboardFooter,
  ResolvedDashboardFormat,
  ResolvedDashboardHeader,
  ResolvedDashboardLayout
} from "./dashboard/types.js";
export type {
  Metric,
  MetricAggregation,
  MetricAggregationAlias,
  MetricAggregationName,
  MetricComparisonConfig,
  MetricComparisonResult,
  MetricConfig,
  MetricContext,
  MetricDirection,
  MetricFilter,
  MetricFormat,
  MetricFormatContext,
  MetricFormatPreset,
  MetricFormatter,
  MetricIcon,
  MetricResult,
  MetricRowContext,
  MetricRowFilter,
  MetricState,
  MetricTrend,
  MetricVariant,
  MetricAggregator
} from "./metric/types.js";
export type {
  ChartExportOptions,
  ChartPNGExportOptions,
  TableCSVExportOptions,
  TableExportOptions,
  TableExportScope,
  TableHTMLExportOptions,
  TableJSONExportOptions
} from "./export/types.js";
export type {
  Report,
  ReportConfig,
  ReportMetadata,
  ReportPreset,
  ReportType
} from "./report/types.js";
export type { NumvizErrorCode, NumvizErrorOptions } from "./errors.js";
