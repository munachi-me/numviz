import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createDashboard,
  NumvizError,
  type DashboardConfig,
  type DashboardFilterChangeEvent,
  type DashboardSelectionChangeEvent,
  type DashboardStateChangeEvent,
  type DashboardWidgetClickEvent,
  type Chart,
  type Table
} from "../src/index.js";

const sales = [
  { region: "North", revenue: 100, orders: 3, month: "Jan", date: "2026-01-05" },
  { region: "South", revenue: 200, orders: 2, month: "Jan", date: "2026-01-18" },
  { region: "North", revenue: 300, orders: 5, month: "Feb", date: "2026-02-09" },
  { region: "East", revenue: 150, orders: 4, month: "Feb", date: "2026-02-21" }
];

function mount(): HTMLDivElement {
  const container = document.createElement("div");
  document.body.appendChild(container);
  return container;
}

function config(overrides: Partial<DashboardConfig> = {}): DashboardConfig {
  return {
    title: "Sales",
    filters: [
      {
        id: "region",
        type: "select",
        field: "region",
        label: "Region",
        placeholder: "All regions"
      },
      {
        id: "query",
        type: "search",
        field: "region",
        label: "Search"
      },
      {
        id: "revenue",
        type: "number-range",
        field: "revenue",
        label: "Revenue"
      },
      {
        id: "date",
        type: "date-range",
        field: "date",
        label: "Date"
      }
    ],
    components: [
      {
        id: "total",
        type: "metric",
        name: "Total revenue",
        data: sales,
        column: "revenue",
        aggregation: "sum",
        format: "currency"
      },
      {
        id: "chart",
        type: "chart",
        chartType: "bar",
        data: sales,
        x: "region",
        y: "revenue",
        crossFilter: { field: "region" }
      },
      {
        id: "table",
        type: "table",
        data: sales,
        columns: ["region", "revenue", "orders"],
        selectable: true,
        crossFilter: { field: "region" }
      }
    ],
    ...overrides
  };
}

function change(control: HTMLInputElement | HTMLSelectElement, value: string): void {
  control.value = value;
  control.dispatchEvent(new Event("change", { bubbles: true }));
}

beforeEach(() => {
  document.body.innerHTML = "";
  document
    .querySelectorAll("style[id^='numviz-dashboard-']")
    .forEach((style) => style.remove());
});

describe("dashboard filters", () => {
  it("renders controls and filters connected charts, tables and metrics", () => {
    const container = mount();
    const dashboard = createDashboard(config()).render(container);
    const region = container.querySelector<HTMLSelectElement>(
      '[data-nv-filter-id="region"] select'
    );
    expect(region).not.toBeNull();
    expect(region?.options.length).toBeGreaterThan(1);

    change(region as HTMLSelectElement, "North");

    expect(dashboard.getFilter("region")).toBe("North");
    expect(
      container.querySelector('[data-nv-component-id="total"] .numviz-metric__value')?.textContent
    ).toBe("$400.00");
    expect(
      container.querySelectorAll('[data-nv-component-id="table"] tbody tr').length
    ).toBe(2);
    expect(
      container.querySelectorAll('[data-nv-component-id="chart"] .numviz-chart__mark').length
    ).toBe(2);
    dashboard.destroy();
  });

  it("supports search, number-range and date-range filters", () => {
    const container = mount();
    const dashboard = createDashboard(config()).render(container);

    const search = container.querySelector<HTMLInputElement>(
      '[data-nv-filter-id="query"] input'
    );
    search!.value = "South";
    search!.dispatchEvent(new Event("input", { bubbles: true }));
    expect(dashboard.getFilter("query")).toBe("South");
    expect(
      container.querySelector('[data-nv-component-id="total"] .numviz-metric__value')?.textContent
    ).toBe("$200.00");

    dashboard.clearFilters();
    const range = container.querySelectorAll<HTMLInputElement>(
      '[data-nv-filter-id="revenue"] input'
    );
    change(range[0]!, "150");
    change(range[1]!, "300");
    expect(dashboard.getFilter("revenue")).toEqual({ from: 150, to: 300 });
    expect(
      container.querySelector('[data-nv-component-id="total"] .numviz-metric__value')?.textContent
    ).toBe("$650.00");

    dashboard.clearFilters();
    const dates = container.querySelectorAll<HTMLInputElement>(
      '[data-nv-filter-id="date"] input'
    );
    change(dates[0]!, "2026-02-01");
    change(dates[1]!, "2026-02-28");
    expect(dashboard.getFilter("date")).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    expect(
      container.querySelector('[data-nv-component-id="total"] .numviz-metric__value')?.textContent
    ).toBe("$450.00");
    dashboard.destroy();
  });

  it("renders custom filters and applies their predicate", () => {
    const container = mount();
    const dashboard = createDashboard(
      config({
        filters: [
          {
            id: "minimum",
            type: "custom",
            field: "revenue",
            label: "Minimum revenue",
            defaultValue: 150,
            matches: (row, value) => Number(row.values.revenue) >= Number(value),
            render: ({ document: doc, setValue }) => {
              const input = doc.createElement("input");
              input.type = "number";
              input.value = "150";
              input.addEventListener("change", () => setValue(Number(input.value)));
              return input;
            }
          }
        ]
      })
    ).render(container);
    expect(container.querySelector('[data-nv-filter-id="minimum"] input')).not.toBeNull();
    expect(
      container.querySelector('[data-nv-component-id="total"] .numviz-metric__value')?.textContent
    ).toBe("$650.00");
    dashboard.destroy();
  });

  it("rejects invalid filters and filter values", () => {
    expect(() =>
      createDashboard(
        config({
          filters: [{ id: "bad", type: "select", field: "region", options: [{} as never] }]
        })
      )
    ).toThrow(NumvizError);
    const dashboard = createDashboard(config()).render(mount());
    expect(() => dashboard.setFilter("region", ["North", "South"])).toThrow(NumvizError);
    expect(() => dashboard.setFilter("missing", "North")).toThrow(NumvizError);
    dashboard.destroy();
  });

  it("preserves filters across updates and data changes", () => {
    const container = mount();
    const dashboard = createDashboard(config()).render(container);
    dashboard.setFilter("region", "North");
    dashboard.updateWidget("table", { title: "Regions" });
    expect(dashboard.getFilter("region")).toBe("North");
    dashboard.setWidgetData("table", sales.slice(0, 2));
    expect(dashboard.getFilter("region")).toBe("North");
    expect(
      container.querySelector('[data-nv-component-id="table"] tbody')?.children.length
    ).toBe(1);
    dashboard.destroy();
  });
});

describe("dashboard cross-filtering and selection", () => {
  it("cross-filters from a chart click and emits widget and filter events", () => {
    const container = mount();
    const dashboard = createDashboard(config()).render(container);
    const clicks: DashboardWidgetClickEvent[] = [];
    const filters: DashboardFilterChangeEvent[] = [];
    const selections: DashboardSelectionChangeEvent[] = [];
    dashboard.on("widgetclick", (event) => clicks.push(event));
    dashboard.on("filterchange", (event) => filters.push(event));
    dashboard.on("selectionchange", (event) => selections.push(event));

    const mark = container.querySelector<SVGElement>(
      '[data-nv-component-id="chart"] .numviz-chart__mark[data-index="0"]'
    );
    mark?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(clicks).toHaveLength(1);
    expect(clicks[0]?.id).toBe("chart");
    expect(filters.some((event) => event.source === "chart")).toBe(true);
    expect(dashboard.getFilter("crossfilter:chart")).toBe("North");
    expect(selections[0]?.indices).toEqual([0]);
    expect(
      container.querySelector('[data-nv-component-id="total"] .numviz-metric__value')?.textContent
    ).toBe("$400.00");
    expect(
      container.querySelector('[data-nv-component-id="chart"] .numviz-chart__mark--selected')
    ).not.toBeNull();
    expect(container.querySelector(".numviz-dashboard__filter-chip")).not.toBeNull();

    const nextMark = container.querySelector<SVGElement>(
      '[data-nv-component-id="chart"] .numviz-chart__mark[data-index="0"]'
    );
    nextMark?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(dashboard.getFilter("crossfilter:chart")).toBeNull();
    dashboard.destroy();
  });

  it("cross-filters from table row selection", () => {
    const container = mount();
    const dashboard = createDashboard(config()).render(container);
    const table = dashboard.getWidget("table")?.instance as Table;
    table.setSelection([1]);

    expect(dashboard.getSelection("table")).toEqual([1]);
    expect(dashboard.getFilter("crossfilter:table")).toBe("South");
    expect(
      container.querySelector('[data-nv-component-id="total"] .numviz-metric__value')?.textContent
    ).toBe("$200.00");
    dashboard.destroy();
  });

  it("restores filters, selections and component visibility from state", () => {
    const container = mount();
    const dashboard = createDashboard(config()).render(container);
    const states: DashboardStateChangeEvent[] = [];
    dashboard.on("statechange", (event) => states.push(event));

    dashboard.setFilter("region", "North");
    dashboard.setSelection("table", [0]);
    dashboard.setComponentVisible("chart", false);
    const state = dashboard.getState();
    expect(state.filters.region).toBe("North");
    expect(state.selections.table).toEqual([0]);
    expect(state.visibleComponents.chart).toBe(false);

    dashboard.clearFilters();
    dashboard.setComponentVisible("chart", true);
    dashboard.setState(state);

    expect(dashboard.getFilter("region")).toBe("North");
    expect(dashboard.getSelection("table")).toEqual([0]);
    expect(dashboard.getWidget("chart")?.element?.hidden).toBe(true);
    expect(states.length).toBeGreaterThan(0);
    dashboard.destroy();
  });

  it("unsubscribes listeners and stops emitting after destroy", () => {
    const dashboard = createDashboard(config()).render(mount());
    const listener = vi.fn();
    const unsubscribe = dashboard.on("filterchange", listener);
    dashboard.setFilter("region", "North");
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    dashboard.setFilter("region", "South");
    expect(listener).toHaveBeenCalledTimes(1);
    dashboard.destroy();
  });
});

describe("dashboard filter targeting and chart selection", () => {
  it("supports multi-select filters and target only connected widgets", () => {
    const container = mount();
    const dashboard = createDashboard(
      config({
        filters: [
          {
            id: "regions",
            type: "multi-select",
            field: "region",
            label: "Regions",
            options: ["North", "South", "East"],
            targets: ["total"]
          }
        ]
      })
    ).render(container);
    const select = container.querySelector<HTMLSelectElement>(
      '[data-nv-filter-id="regions"] select'
    );
    select!.options[0]!.selected = true;
    select!.options[1]!.selected = true;
    select!.dispatchEvent(new Event("change", { bubbles: true }));
    expect(dashboard.getFilter("regions")).toEqual(["North", "South"]);
    expect(
      container.querySelector('[data-nv-component-id="total"] .numviz-metric__value')?.textContent
    ).toBe("$600.00");
    expect(
      container.querySelectorAll('[data-nv-component-id="table"] tbody tr').length
    ).toBe(4);
    dashboard.destroy();
  });

  it("exposes chart point selection and restores serialized cross-filters", () => {
    const container = mount();
    const dashboard = createDashboard(config()).render(container);
    const chart = dashboard.getWidget("chart")?.instance as Chart;
    chart?.setSelectedIndex(1);
    expect(chart?.getSelectedIndex()).toBe(1);
    expect(
      container.querySelectorAll('[data-nv-component-id="chart"] .numviz-chart__mark--selected')
        .length
    ).toBe(1);

    const mark = container.querySelector<SVGElement>(
      '[data-nv-component-id="chart"] .numviz-chart__mark[data-index="0"]'
    );
    mark?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    const state = dashboard.getState();
    expect(state.crossFilters?.["crossfilter:chart"]?.source).toBe("chart");
    dashboard.clearFilters();
    expect(dashboard.getFilter("crossfilter:chart")).toBeNull();
    expect(
      container.querySelectorAll('[data-nv-component-id="chart"] .numviz-chart__mark--selected')
        .length
    ).toBe(0);
    dashboard.setState(state);
    expect(dashboard.getFilter("crossfilter:chart")).toBe("North");
    expect(container.querySelector(".numviz-dashboard__filter-chip")).not.toBeNull();
    dashboard.destroy();
  });
});
