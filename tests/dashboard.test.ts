import { beforeEach, describe, expect, it } from "vitest";
import {
  createDashboard,
  createMetric,
  createTable,
  NumvizError,
  type DashboardConfig,
  type DashboardCustomComponent,
  type DashboardMetricComponent,
  type Table
} from "../src/index.js";

const sales = [
  { region: "North", revenue: 100, orders: 3, month: "Jan" },
  { region: "South", revenue: 200, orders: 2, month: "Jan" },
  { region: "North", revenue: 300, orders: 5, month: "Feb" }
];

const employees = [
  { name: "Ada", salary: 120000 },
  { name: "Grace", salary: 145000 },
  { name: "Alan", salary: 98000 }
];

function mount(): HTMLDivElement {
  const container = document.createElement("div");
  document.body.appendChild(container);
  return container;
}

function baseConfig(overrides: Partial<DashboardConfig> = {}): DashboardConfig {
  return {
    title: "Sales Analytics",
    description: "Business performance overview",
    components: [
      {
        id: "revenue",
        type: "metric",
        name: "Total Revenue",
        data: sales,
        column: "revenue",
        aggregation: "sum",
        format: "currency"
      },
      {
        id: "sales",
        type: "chart",
        chartType: "bar",
        title: "Revenue by month",
        data: sales,
        x: "month",
        y: "revenue"
      },
      {
        id: "records",
        type: "table",
        data: employees
      }
    ],
    ...overrides
  };
}

beforeEach(() => {
  document.body.innerHTML = "";
  document
    .querySelectorAll("style[id^='numviz-dashboard-']")
    .forEach((style) => style.remove());
});

describe("dashboard composition", () => {
  it("renders a responsive dashboard of independent charts, metrics and tables", () => {
    const container = mount();
    const dashboard = createDashboard(baseConfig()).render(container);

    const root = container.querySelector<HTMLElement>("[data-numviz-root='dashboard']");
    expect(root).not.toBeNull();
    expect(root?.getAttribute("role")).toBe("region");
    expect(root?.getAttribute("aria-label")).toBe("Sales Analytics");
    expect(root?.querySelector(".numviz-dashboard__title")?.textContent).toBe("Sales Analytics");
    expect(root?.querySelector(".numviz-dashboard__description")?.textContent).toBe(
      "Business performance overview"
    );
    expect(root?.querySelectorAll(".numviz-dashboard__widget")).toHaveLength(3);
    expect(root?.querySelector('[data-nv-component-id="revenue"] .numviz-metric__value')?.textContent).toBe(
      "$600.00"
    );
    expect(root?.querySelector('[data-nv-component-id="sales"] svg')).not.toBeNull();
    expect(root?.querySelector('[data-nv-component-id="records"] table')).not.toBeNull();
    expect(dashboard.widgets).toHaveLength(3);
    expect(dashboard.getWidget("revenue")?.instance).not.toBeNull();
    expect(dashboard.getWidget("missing")).toBeNull();
    dashboard.destroy();
  });

  it("supports headings, text, descriptions, dividers, images and custom components", () => {
    const container = mount();
    let destroyed = false;
    const custom: DashboardCustomComponent = {
      id: "badge",
      type: "custom",
      render: ({ document: doc }) => {
        const badge = doc.createElement("strong");
        badge.textContent = "Live";
        return badge;
      },
      destroy: () => {
        destroyed = true;
      }
    };
    const dashboard = createDashboard({
      title: "Content",
      header: "Updated just now",
      footer: "Source: internal",
      components: [
        { id: "heading", type: "heading", text: "Overview", level: 2 },
        { id: "text", type: "text", text: "Plain text" },
        { id: "description", type: "description", text: "Supporting copy" },
        { id: "divider", type: "divider" },
        {
          id: "image",
          type: "image",
          src: "https://example.com/chart.png",
          alt: "Revenue chart",
          caption: "Monthly revenue"
        },
        custom,
        { id: "string", type: "custom", render: () => "Safe text" }
      ]
    }).render(container);

    expect(container.querySelector("h2")?.textContent).toBe("Overview");
    expect(container.querySelector(".numviz-dashboard__text")?.textContent).toBe("Plain text");
    expect(container.querySelector(".numviz-dashboard__description-text")?.textContent).toBe(
      "Supporting copy"
    );
    expect(container.querySelector("hr.numviz-dashboard__divider")).not.toBeNull();
    expect(container.querySelector("img")?.getAttribute("alt")).toBe("Revenue chart");
    expect(container.querySelector("figcaption")?.textContent).toBe("Monthly revenue");
    expect(dashboard.getWidget("badge")?.element?.textContent).toBe("Live");
    expect(dashboard.getWidget("string")?.element?.textContent).toBe("Safe text");
    expect(container.querySelector(".numviz-dashboard__header-text")?.textContent).toBe(
      "Updated just now"
    );
    expect(container.querySelector(".numviz-dashboard__footer")?.textContent).toBe(
      "Source: internal"
    );

    dashboard.destroy();
    expect(destroyed).toBe(true);
  });

  it("does not parse HTML returned by a custom component", () => {
    const container = mount();
    const dashboard = createDashboard({
      components: [{ id: "unsafe", type: "custom", render: () => "<b>not markup</b>" }]
    }).render(container);
    expect(container.querySelector("b")).toBeNull();
    expect(container.textContent).toContain("<b>not markup</b>");
    dashboard.destroy();
  });

  it("applies responsive columns, breakpoints, spacing and widget placement", () => {
    const container = mount();
    createDashboard(
      baseConfig({
        layout: {
          columns: { base: 1, sm: 2, md: 2, lg: 3, xl: 4 },
          breakpoints: { sm: 500, md: 700, lg: 900, xl: 1100 },
          rows: 2,
          autoRows: 120,
          gap: 20,
          rowGap: "12px",
          padding: 24,
          align: "center"
        },
        components: [
          {
            id: "revenue",
            type: "metric",
            name: "Revenue",
            data: sales,
            column: "revenue",
            layout: { columnSpan: 2, rowSpan: 2, order: 2, minHeight: 180, align: "start" }
          }
        ]
      })
    ).render(container);

    const style = document.querySelector("style[id^='numviz-dashboard-']");
    expect(style?.textContent).toContain("@media (min-width: 500px)");
    expect(style?.textContent).toContain("repeat(4, minmax(0, 1fr))");
    const root = container.querySelector<HTMLElement>(".numviz-dashboard");
    expect(root?.style.padding).toBe("24px");
    const grid = container.querySelector<HTMLElement>(".numviz-dashboard__grid");
    expect(grid?.style.columnGap).toBe("20px");
    expect(grid?.style.rowGap).toBe("12px");
    expect(grid?.style.gridTemplateRows).toBe("repeat(2, minmax(0, 1fr))");
    expect(grid?.style.gridAutoRows).toBe("120px");
    expect(grid?.style.alignItems).toBe("center");
    expect(style?.textContent).toContain('[data-nv-slot="0"] { grid-column: span 1; }');
    expect(style?.textContent).toContain('[data-nv-slot="0"] { grid-column: span 2; }');
    const widget = container.querySelector<HTMLElement>(".numviz-dashboard__widget");
    expect(widget?.dataset.nvSlot).toBe("0");
    expect(widget?.style.gridRow).toBe("span 2");
    expect(widget?.style.order).toBe("2");
    expect(widget?.style.minHeight).toBe("180px");
    expect(widget?.style.alignSelf).toBe("start");
  });

  it("supports dashboard theme, background, global format and per-widget overrides", () => {
    const container = mount();
    createDashboard(
      baseConfig({
        theme: { mode: "dark", accent: "#22C55E" },
        background: "#010203",
        format: { locale: "de-DE", currency: "EUR" },
        widgetStyle: { borderRadius: 4, boxShadow: "lg" },
        layout: { variant: "compact" },
        components: [
          {
            id: "revenue",
            type: "metric",
            name: "Revenue",
            data: sales,
            column: "revenue",
            aggregation: "sum",
            format: "currency",
            style: { background: "#111111", padding: 8, className: "custom-card" },
            theme: { accent: "#EF4444" }
          }
        ]
      })
    ).render(container);

    const root = container.querySelector<HTMLElement>(".numviz-dashboard");
    expect(root?.style.background).toBe("rgb(1, 2, 3)");
    expect(root?.classList.contains("numviz-dashboard--compact")).toBe(true);
    const widget = container.querySelector<HTMLElement>(".numviz-dashboard__widget");
    expect(widget?.classList.contains("custom-card")).toBe(true);
    expect(widget?.style.background).toBe("rgb(17, 17, 17)");
    expect(widget?.style.padding).toBe("8px");
    expect(widget?.style.borderRadius).toBe("4px");
    expect(widget?.style.boxShadow).toContain("rgb(15 23 42 / 16%)");
    const metric = container.querySelector<HTMLElement>(".numviz-metric");
    expect(metric?.style.getPropertyValue("--nv-accent")).toBe("#EF4444");
    expect(metric?.style.getPropertyValue("--nv-mode")).toBe("");
    expect(metric?.textContent).toContain("600,00");
    expect(metric?.textContent).toContain("€");
  });

  it("accepts a dashboard metric title without a separate name", () => {
    const container = mount();
    const dashboard = createDashboard({
      components: [
        {
          id: "revenue",
          type: "metric",
          title: "Total Revenue",
          data: sales,
          column: "revenue",
          aggregation: "sum"
        }
      ]
    }).render(container);
    expect(container.querySelector(".numviz-metric__title")?.textContent).toBe("Total Revenue");
    expect(container.querySelector(".numviz-metric__value")?.textContent).toBe("600");
    expect(dashboard.getWidget("revenue")?.component.title).toBe("Total Revenue");
    dashboard.destroy();
  });

  it("reconciles updates and preserves table, chart and metric engines", () => {
    const container = mount();
    const config = baseConfig();
    const dashboard = createDashboard(config).render(container);
    const table = dashboard.getWidget("records")?.instance as Table | undefined;
    const chart = dashboard.getWidget("sales")?.instance;
    const metric = dashboard.getWidget("revenue")?.instance;
    table?.setSort("salary", "desc");
    expect(table?.getState().sort).toEqual({
      field: "salary",
      direction: "desc"
    });

    dashboard.update({
      ...config,
      title: "Updated",
      components: [
        {
          id: "records",
          type: "table",
          data: employees,
          selectable: true
        },
        {
          ...(config.components[0] as DashboardMetricComponent),
          name: "Net revenue"
        },
        config.components[1]!
      ]
    });

    expect(container.querySelector(".numviz-dashboard__title")?.textContent).toBe("Updated");
    expect(dashboard.getWidget("records")?.instance).toBe(table);
    expect(dashboard.getWidget("revenue")?.instance).toBe(metric);
    expect(dashboard.getWidget("sales")?.instance).toBe(chart);
    expect(table?.isDestroyed).toBe(false);
    expect(chart?.isDestroyed).toBe(false);
    expect(table?.getState().sort).toEqual({ field: "salary", direction: "desc" });
    expect(container.querySelector(".numviz-metric__title")?.textContent).toBe("Net revenue");
    expect(
      [...container.querySelectorAll(".numviz-dashboard__widget")].map(
        (element) => element.getAttribute("data-nv-component-id")
      )
    ).toEqual(["records", "revenue", "sales"]);

    dashboard.update({
      ...config,
      title: "Updated",
      components: [config.components[0]!, config.components[2]!]
    });
    expect(dashboard.getWidget("sales")).toBeNull();
    expect(container.querySelector('[data-nv-component-id="sales"]')).toBeNull();
    dashboard.destroy();
  });

  it("updates chart widgets in place", () => {
    const container = mount();
    const config = baseConfig();
    const dashboard = createDashboard(config).render(container);
    const chart = dashboard.getWidget("sales")?.instance;
    expect(container.querySelectorAll('[data-numviz-part="bar"]')).toHaveLength(3);

    dashboard.update({
      ...config,
      components: config.components.map((component) =>
        component.id === "sales"
          ? {
              ...component,
              data: [...sales, { region: "West", revenue: 400, orders: 1, month: "Mar" }]
            }
          : component
      )
    });

    expect(dashboard.getWidget("sales")?.instance).toBe(chart);
    expect(container.querySelectorAll('[data-numviz-part="bar"]')).toHaveLength(4);
    dashboard.destroy();
  });

  it("rejects an invalid update without destroying the current dashboard", () => {
    const container = mount();
    const dashboard = createDashboard(baseConfig()).render(container);
    const metric = dashboard.getWidget("revenue")?.instance;
    expect(() =>
      dashboard.update({
        ...baseConfig(),
        components: [
          {
            id: "broken",
            type: "chart",
            chartType: "treemap" as never,
            data: sales
          }
        ]
      })
    ).toThrow(NumvizError);
    expect(metric?.isDestroyed).toBe(false);
    expect(container.querySelector(".numviz-dashboard__title")?.textContent).toBe("Sales Analytics");
    expect(container.querySelector(".numviz-metric__value")?.textContent).toBe("$600.00");
    expect(dashboard.widgets.map((widget) => widget.id)).toEqual(["revenue", "sales", "records"]);
    dashboard.destroy();
  });

  it("refreshes current data and destroys all child engines", () => {
    const container = mount();
    const mutable = sales.map((row) => ({ ...row }));
    const dashboard = createDashboard({
      title: "Mutable",
      components: [
        {
          id: "revenue",
          type: "metric",
          name: "Revenue",
          data: mutable,
          column: "revenue",
          aggregation: "sum"
        },
        {
          id: "chart",
          type: "chart",
          chartType: "bar",
          data: mutable,
          x: "month",
          y: "revenue"
        }
      ]
    }).render(container);
    expect(container.querySelector(".numviz-metric__value")?.textContent).toBe("600");

    mutable.push({ region: "East", revenue: 400, orders: 1, month: "Feb" });
    dashboard.refresh();
    expect(container.querySelector(".numviz-metric__value")?.textContent).toBe("1,000");

    const metric = dashboard.getWidget("revenue")?.instance;
    const chart = dashboard.getWidget("chart")?.instance;
    dashboard.destroy();
    expect(metric?.isDestroyed).toBe(true);
    expect(chart?.isDestroyed).toBe(true);
    expect(container.querySelector(".numviz-dashboard")).toBeNull();
    expect(document.querySelector("style[id^='numviz-dashboard-']")).toBeNull();
  });

  it("re-renders without leaking styles or duplicating dashboard roots", () => {
    const container = mount();
    const dashboard = createDashboard(baseConfig());
    dashboard.render(container);
    dashboard.render(container);
    expect(container.querySelectorAll(".numviz-dashboard")).toHaveLength(1);
    expect(document.querySelectorAll("style[id^='numviz-dashboard-']")).toHaveLength(1);
    dashboard.destroy();
    expect(document.querySelectorAll("style[id^='numviz-dashboard-']")).toHaveLength(0);
  });

  it("scopes layout styles to each dashboard instance", () => {
    const first = mount();
    const second = mount();
    createDashboard(baseConfig({ layout: { columns: 2 } })).render(first);
    createDashboard(baseConfig({ layout: { columns: 3 } })).render(second);
    const styles = [...document.querySelectorAll("style[id^='numviz-dashboard-']")];
    expect(styles).toHaveLength(2);
    expect(styles[0]?.textContent).not.toBe(styles[1]?.textContent);
    expect(styles[0]?.textContent).toContain("repeat(2, minmax(0, 1fr))");
    expect(styles[1]?.textContent).toContain("repeat(3, minmax(0, 1fr))");
  });

  it("validates dashboard configuration before rendering", () => {
    expect(() => createDashboard({ components: {} as never })).toThrow(NumvizError);
    expect(() =>
      createDashboard({
        components: [
          { id: "same", type: "text", text: "One" },
          { id: "same", type: "text", text: "Two" }
        ]
      })
    ).toThrow(/Duplicate dashboard component id/);
    expect(() =>
      createDashboard({ components: [{ id: "bad", type: "heading", text: "" }] })
    ).toThrow(NumvizError);
    expect(() =>
      createDashboard({
        components: [{ id: "img", type: "image", src: "", alt: "" }]
      })
    ).toThrow(NumvizError);
    expect(() =>
      createDashboard({
        components: [{ id: "custom", type: "custom", render: "markup" as never }]
      })
    ).toThrow(NumvizError);
    expect(() =>
      createDashboard({
        components: [],
        layout: { columns: 0 }
      })
    ).toThrow(NumvizError);
    expect(() =>
      createDashboard({
        components: [],
        layout: { breakpoints: { sm: 900, md: 800 } }
      })
    ).toThrow(/breakpoints/);
    expect(() =>
      createDashboard({
        components: [
          {
            id: "bad-chart",
            type: "chart",
            chartType: "treemap" as never,
            data: []
          }
        ]
      })
    ).toThrow(NumvizError);
  });

  it("rejects invalid custom render results after mounting", () => {
    const container = mount();
    const dashboard = createDashboard({
      components: [
        {
          id: "bad",
          type: "custom",
          render: () => ({}) as never
        }
      ]
    });
    expect(() => dashboard.render(container)).toThrow(NumvizError);
    dashboard.destroy();
  });

  it("requires a DOM to render and renders no data on the server", () => {
    const config = baseConfig();
    const dashboard = createDashboard(config);
    expect(dashboard.element).toBeNull();
    expect(dashboard.config.title).toBe("Sales Analytics");
    expect(dashboard.widgets.map((widget) => widget.id)).toEqual(["revenue", "sales", "records"]);
    expect(createMetric({ name: "Revenue", data: sales, column: "revenue" }).result.value).toBe(600);
    expect(createTable({ data: employees }).getState().totalRowCount).toBe(3);
    dashboard.destroy();
    expect(() => dashboard.render("#dashboard")).toThrow(/destroyed/i);
  });
});
