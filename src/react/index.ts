"use client";

import {
  Children,
  Fragment,
  createElement,
  forwardRef,
  isValidElement,
  useEffect,
  useImperativeHandle,
  useRef,
  type CSSProperties,
  type ReactNode
} from "react";
import { createChart } from "../charts/createChart.js";
import { createDashboard } from "../dashboard/dashboard.js";
import type {
  Dashboard as DashboardInstance,
  DashboardComponent,
  DashboardConfig,
  DashboardWidget as DashboardWidgetInfo
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
import type { Chart as ChartInstance, ChartConfig } from "../types.js";
import { useStableValue } from "./stable.js";

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
  const mountedRef = useRef(false);
  const config = useStableValue(toTableConfig(props));

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const table = createTable(config);
    table.render(host);
    tableRef.current = table;
    return () => {
      table.destroy();
      tableRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    tableRef.current?.update(config);
  }, [config]);

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
  const mountedRef = useRef(false);
  const config = useStableValue(toMetricConfig(props));

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const metric = createMetric(config);
    metric.render(host);
    metricRef.current = metric;
    return () => {
      metric.destroy();
      metricRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    metricRef.current?.update(config);
  }, [config]);

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

export interface ChartProps extends ChartConfig {
  /** Inline styles applied to the React host element. */
  style?: CSSProperties;
}

export interface ChartHandle {
  getChart(): ChartInstance | null;
  getElement(): HTMLDivElement | null;
}

function toChartConfig(props: ChartProps): ChartConfig {
  const config: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (key === "style") continue;
    if (value !== undefined) config[key] = value;
  }
  return config as unknown as ChartConfig;
}

/**
 * React wrapper around the vanilla chart engine. React renders only a host
 * element; the chart is created in an effect so server rendering never touches
 * the DOM. Data and options update in place when props change.
 */
export const Chart = forwardRef<ChartHandle, ChartProps>(function Chart(props, ref) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<ChartInstance | null>(null);
  const mountedRef = useRef(false);
  const config = useStableValue(toChartConfig(props));

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const chart = createChart(config);
    chart.render(host);
    chartRef.current = chart;
    return () => {
      chart.destroy();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    chartRef.current?.update(config);
  }, [config]);

  useImperativeHandle(
    ref,
    () => ({
      getChart: () => chartRef.current,
      getElement: () => hostRef.current
    }),
    []
  );

  return createElement("div", {
    ref: hostRef,
    className: "numviz-react-chart",
    style: props.style,
    "data-numviz-react": "chart"
  });
});

export type DashboardWidgetProps =
  | (DashboardComponent & {
      readonly component?: undefined;
      readonly config?: undefined;
      readonly containerStyle?: CSSProperties;
      readonly hostStyle?: CSSProperties;
    })
  | {
      readonly component: DashboardComponent;
      readonly config?: undefined;
      readonly containerStyle?: CSSProperties;
      readonly hostStyle?: CSSProperties;
      readonly style?: CSSProperties;
    }
  | {
      readonly config: DashboardComponent;
      readonly component?: undefined;
      readonly containerStyle?: CSSProperties;
      readonly hostStyle?: CSSProperties;
      readonly style?: CSSProperties;
    };

export interface DashboardWidgetHandle {
  getDashboard(): DashboardInstance | null;
  getWidget(id?: string): DashboardWidgetInfo | null;
  getElement(): HTMLDivElement | null;
}

function toWidgetComponent(props: DashboardWidgetProps): DashboardComponent {
  if ("component" in props && props.component) return props.component;
  if ("config" in props && props.config) return props.config;
  const config: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (key === "containerStyle" || key === "hostStyle" || key === "component" || key === "config") {
      continue;
    }
    if (value !== undefined) config[key] = value;
  }
  return config as unknown as DashboardComponent;
}

/**
 * Renders one dashboard widget outside a full dashboard. It can also be passed
 * as a direct child of `Dashboard` to declare a widget in JSX.
 */
export const DashboardWidget = forwardRef<DashboardWidgetHandle, DashboardWidgetProps>(
  function DashboardWidget(props, ref) {
    const hostRef = useRef<HTMLDivElement | null>(null);
    const dashboardRef = useRef<DashboardInstance | null>(null);
    const mountedRef = useRef(false);
    const component = useStableValue(toWidgetComponent(props));
    const componentRef = useRef(component);
    componentRef.current = component;

    useEffect(() => {
      const host = hostRef.current;
      if (!host) return;
      const dashboard = createDashboard({ components: [component], layout: { columns: 1 } });
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
      dashboardRef.current?.update({ components: [component], layout: { columns: 1 } });
    }, [component]);

    useImperativeHandle(
      ref,
      () => ({
        getDashboard: () => dashboardRef.current,
        getWidget: (id?: string) =>
          dashboardRef.current?.getWidget(id ?? componentRef.current.id) ?? null,
        getElement: () => hostRef.current
      }),
      []
    );

    const componentStyle =
      "component" in props || "config" in props
        ? (props.style as CSSProperties | undefined)
        : undefined;
    return createElement("div", {
      ref: hostRef,
      className: "numviz-react-dashboard-widget",
      style: props.containerStyle ?? props.hostStyle ?? componentStyle,
      "data-numviz-react": "dashboard-widget"
    });
  }
);

export interface DashboardProps extends Omit<DashboardConfig, "components"> {
  /** Widgets to render. Widgets can also be declared as `DashboardWidget` children. */
  components?: readonly DashboardComponent[];
  /** Direct `DashboardWidget` children declaring additional widgets. */
  children?: ReactNode;
  /** Inline styles applied to the React host element. */
  style?: CSSProperties;
}

function collectDashboardWidgets(children: ReactNode): DashboardComponent[] {
  const components: DashboardComponent[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    if (child.type === DashboardWidget) {
      components.push(toWidgetComponent(child.props as DashboardWidgetProps));
      return;
    }
    if (child.type === Fragment) {
      components.push(
        ...collectDashboardWidgets((child.props as { children?: ReactNode }).children)
      );
    }
  });
  return components;
}

export interface DashboardHandle {
  getDashboard(): DashboardInstance | null;
  getElement(): HTMLDivElement | null;
}

function toDashboardConfig(props: DashboardProps): DashboardConfig {
  const { children, components, ...rest } = props;
  delete rest.style;
  return {
    ...rest,
    components: [...(components ?? []), ...collectDashboardWidgets(children)]
  } as DashboardConfig;
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
    const config = useStableValue(toDashboardConfig(props));

    useEffect(() => {
      const host = hostRef.current;
      if (!host) return;
      const dashboard = createDashboard(config);
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
      dashboardRef.current?.update(config);
    }, [config]);

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
  DashboardLayout,
  DashboardWidgetStyle
} from "../dashboard/types.js";
export type { DashboardWidgetInfo };
export type { TableRow, MetricResult, MetricConfig };
