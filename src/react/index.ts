"use client";

import {
  createElement,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type CSSProperties
} from "react";
import { createDashboard } from "../dashboard/dashboard.js";
import type {
  Dashboard as DashboardInstance,
  DashboardConfig
} from "../dashboard/types.js";
import { createMetric } from "../metric/metric.js";
import type {
  Metric as MetricInstance,
  MetricConfig,
  MetricResult
} from "../metric/types.js";
import { createTable } from "../table/table.js";
import type {
  Table,
  TableConfig,
  TableRow,
  TableSortState
} from "../table/types.js";

export interface DataTableProps extends Omit<TableConfig, "loading" | "error"> {
  /** Controlled sort state. Omit for an uncontrolled table. */
  sort?: TableSortState | null;
  /** Controlled page number (1-based). Omit for uncontrolled pagination. */
  page?: number;
  /** Controlled search query. Omit for uncontrolled searching. */
  search?: string;
  /** Controlled selected row indices. Omit for uncontrolled selection. */
  selectedRows?: readonly number[];
  loading?: boolean;
  error?: string | null;
  /** Inline styles applied to the React host element. */
  style?: CSSProperties;
}

export interface DataTableHandle {
  getTable(): Table | null;
  getElement(): HTMLDivElement | null;
}

const CONTROLLED_KEYS = new Set([
  "sort",
  "page",
  "search",
  "selectedRows",
  "style"
]);

function toTableConfig(props: DataTableProps): TableConfig {
  const config: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (CONTROLLED_KEYS.has(key)) continue;
    if (value !== undefined) config[key] = value;
  }
  if (props.selectedRows !== undefined && props.onSelectionChange === undefined) {
    config.selectedRows = props.selectedRows;
  }
  return config as unknown as TableConfig;
}

/**
 * React wrapper around the vanilla table engine. React renders only a host
 * element; the table itself is created in an effect so server rendering never
 * touches the DOM. Pass controlled props (`sort`, `page`, `search`,
 * `selectedRows`) and their callbacks for controlled state.
 */
export const DataTable = forwardRef<DataTableHandle, DataTableProps>(function DataTable(
  props,
  ref
) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const tableRef = useRef<Table | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const table = createTable(toTableConfig(props));
    table.render(host);
    tableRef.current = table;
    return () => {
      table.destroy();
      tableRef.current = null;
    };
  }, []);

  useEffect(() => {
    tableRef.current?.update(toTableConfig(props));
  });

  useEffect(() => {
    if (props.sort === undefined) return;
    tableRef.current?.setSort(props.sort?.field ?? null, props.sort?.direction ?? "asc", false);
  }, [props.sort?.field, props.sort?.direction]);

  useEffect(() => {
    if (props.page === undefined) return;
    tableRef.current?.setPage(props.page, false);
  }, [props.page]);

  useEffect(() => {
    if (props.search === undefined) return;
    tableRef.current?.setSearch(props.search, false);
  }, [props.search]);

  const selectedKey = props.selectedRows?.join(",");
  useEffect(() => {
    if (props.selectedRows === undefined) return;
    tableRef.current?.setSelection(props.selectedRows, false);
  }, [selectedKey]);

  useEffect(() => {
    tableRef.current?.setLoading(props.loading ?? false);
  }, [props.loading]);

  useEffect(() => {
    tableRef.current?.setError(props.error ?? null);
  }, [props.error]);

  useImperativeHandle(
    ref,
    () => ({
      getTable: () => tableRef.current,
      getElement: () => hostRef.current
    }),
    []
  );

  return createElement("div", {
    ref: hostRef,
    className: "numviz-react-table",
    style: props.style,
    "data-numviz-react": "table"
  });
});

export interface MetricProps extends Omit<MetricConfig, "icon"> {
  /** Text glyph or emoji shown in the KPI header. */
  icon?: string;
  /** Inline styles applied to the React host element. */
  style?: CSSProperties;
}

export interface MetricHandle {
  getMetric(): MetricInstance | null;
  getElement(): HTMLDivElement | null;
}

function toMetricConfig(props: MetricProps): MetricConfig {
  const config: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (key === "style") continue;
    if (value !== undefined) config[key] = value;
  }
  return config as unknown as MetricConfig;
}

/**
 * React wrapper around the vanilla KPI metric card. React renders only a host
 * element; the card is created in an effect so server rendering never touches
 * the DOM. Metric values are recomputed when props change.
 */
export const Metric = forwardRef<MetricHandle, MetricProps>(function Metric(props, ref) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const metricRef = useRef<MetricInstance | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const metric = createMetric(toMetricConfig(props));
    metric.render(host);
    metricRef.current = metric;
    return () => {
      metric.destroy();
      metricRef.current = null;
    };
  }, []);

  useEffect(() => {
    metricRef.current?.update(toMetricConfig(props));
  });

  useImperativeHandle(
    ref,
    () => ({
      getMetric: () => metricRef.current,
      getElement: () => hostRef.current
    }),
    []
  );

  return createElement("div", {
    ref: hostRef,
    className: "numviz-react-metric",
    style: props.style,
    "data-numviz-react": "metric"
  });
});

export interface DashboardProps extends DashboardConfig {
  /** Inline styles applied to the React host element. */
  style?: CSSProperties;
}

export interface DashboardHandle {
  getDashboard(): DashboardInstance | null;
  getElement(): HTMLDivElement | null;
}

function toDashboardConfig(props: DashboardProps): DashboardConfig {
  const config: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (key === "style") continue;
    if (value !== undefined) config[key] = value;
  }
  return config as unknown as DashboardConfig;
}

/**
 * React wrapper around the vanilla dashboard engine. React renders only a host
 * element; the dashboard and its child components are created in an effect so
 * server rendering never touches the DOM. Existing widget engines are
 * reconciled when dashboard props change.
 */
export const Dashboard = forwardRef<DashboardHandle, DashboardProps>(
  function Dashboard(props, ref) {
    const hostRef = useRef<HTMLDivElement | null>(null);
    const dashboardRef = useRef<DashboardInstance | null>(null);
    const mountedRef = useRef(false);

    useEffect(() => {
      const host = hostRef.current;
      if (!host) return;
      const dashboard = createDashboard(toDashboardConfig(props));
      dashboard.render(host);
      dashboardRef.current = dashboard;
      return () => {
        dashboard.destroy();
        dashboardRef.current = null;
      };
    }, []);

    useEffect(() => {
      if (!mountedRef.current) {
        mountedRef.current = true;
        return;
      }
      dashboardRef.current?.update(toDashboardConfig(props));
    });

    useImperativeHandle(
      ref,
      () => ({
        getDashboard: () => dashboardRef.current,
        getElement: () => hostRef.current
      }),
      []
    );

    return createElement("div", {
      ref: hostRef,
      className: "numviz-react-dashboard",
      style: props.style,
      "data-numviz-react": "dashboard"
    });
  }
);

export type {
  DashboardConfig,
  DashboardComponent,
  DashboardChartComponent,
  DashboardTableComponent,
  DashboardMetricComponent,
  DashboardHeadingComponent,
  DashboardTextComponent,
  DashboardDescriptionComponent,
  DashboardDividerComponent,
  DashboardImageComponent,
  DashboardCustomComponent,
  DashboardWidget,
  DashboardLayout,
  DashboardWidgetStyle
} from "../dashboard/types.js";
export type { TableRow, MetricResult, MetricConfig };
