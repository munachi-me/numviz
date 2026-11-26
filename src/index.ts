import { createChart } from "./charts/createChart.js";
import { isNumvizError, NumvizError } from "./errors.js";
import { VERSION } from "./version.js";

/**
 * Default Numviz namespace, built from the same function references as the
 * named exports. There is a single implementation behind both import styles.
 */
const Numviz = Object.freeze({
  createChart,
  version: VERSION,
  NumvizError
});

export { createChart };
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
  ThemeConfig,
  ThemeMode,
  ThemeTokens,
  TickValue,
  TooltipConfig,
  TooltipContext,
  ValueFormatter
} from "./types.js";
export type { NumvizErrorCode, NumvizErrorOptions } from "./errors.js";
