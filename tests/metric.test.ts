import { beforeEach, describe, expect, it } from "vitest";
import { createMetric, NumvizError } from "../src/index.js";

const data = [
  { region: "North", revenue: 100, orders: 1, customer: "A" },
  { region: "South", revenue: "200", orders: 2, customer: "B" },
  { region: "North", revenue: 300, orders: 3, customer: "A" },
  { region: "East", revenue: null, orders: 0, customer: "" },
  { region: "West", revenue: 400, orders: 4, customer: "C" }
];

const previous = [
  { region: "North", revenue: 100, orders: 1, customer: "A" },
  { region: "South", revenue: 200, orders: 2, customer: "B" },
  { region: "North", revenue: 300, orders: 3, customer: "A" },
  { region: "West", revenue: 200, orders: 2, customer: "C" }
];

function mount(): HTMLDivElement {
  const container = document.createElement("div");
  document.body.appendChild(container);
  return container;
}

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("metric aggregations", () => {
  it("computes built-in aggregations from normalized data", () => {
    expect(
      createMetric({ name: "Revenue", data, column: "revenue", aggregation: "sum" }).result
    ).toMatchObject({ value: 1000, validCount: 4, missingCount: 1, rowCount: 5 });

    expect(
      createMetric({ name: "Revenue", data, column: "revenue", aggregation: "average" }).result.value
    ).toBe(250);
    expect(
      createMetric({ name: "Revenue", data, column: "revenue", aggregation: "minimum" }).result.value
    ).toBe(100);
    expect(
      createMetric({ name: "Revenue", data, column: "revenue", aggregation: "maximum" }).result.value
    ).toBe(400);
    expect(
      createMetric({ name: "Revenue", data, column: "revenue", aggregation: "median" }).result.value
    ).toBe(250);
    expect(
      createMetric({ name: "Rows", data, aggregation: "count" }).result.value
    ).toBe(5);
    expect(
      createMetric({ name: "Customers", data, column: "customer", aggregation: "distinct" })
        .result
    ).toMatchObject({ value: 3, validCount: 4, missingCount: 1 });
  });

  it("accepts matrix and dataset-shaped input", () => {
    const matrix = createMetric({
      name: "Matrix",
      data: [
        ["Jan", 10],
        ["Feb", 20]
      ],
      columns: [
        { key: "month", type: "string" },
        { key: "value", type: "number" }
      ],
      column: "value",
      aggregation: "sum"
    });
    expect(matrix.result.value).toBe(30);

    const dataset = createMetric({
      name: "Dataset",
      data: {
        columns: [{ key: "region" }, { key: "value", type: "number" }],
        rows: [{ region: "North", value: 5 }]
      },
      column: "value",
      aggregation: "average"
    });
    expect(dataset.result.value).toBe(5);
  });

  it("supports filtered data, percentage and custom aggregations", () => {
    const north = createMetric({
      name: "North revenue",
      data,
      column: "revenue",
      aggregation: "sum",
      filter: { region: "North" }
    });
    expect(north.result.value).toBe(400);
    expect(north.result.matchedRowCount).toBe(2);
    expect(north.result.validCount).toBe(2);

    const share = createMetric({
      name: "North share",
      data,
      aggregation: "percentage",
      filter: (row) => row.values.region === "North"
    });
    expect(share.result.value).toBeCloseTo(0.4);
    expect(share.result.formattedValue).toBe("40%");

    const custom = createMetric({
      name: "Order weight",
      data,
      column: "orders",
      aggregation: (context) => context.values.reduce((total, value) => total + value * 2, 0)
    });
    expect(custom.result.value).toBe(20);
    expect(custom.result.aggregation).toBe("custom");
  });

  it("handles empty data and invalid values", () => {
    const empty = createMetric({ name: "Empty", data: [], column: "revenue" });
    expect(empty.result.value).toBeNull();
    expect(empty.result.formattedValue).toBe("");
    expect(empty.result.rowCount).toBe(0);

    const count = createMetric({ name: "Count", data: [], aggregation: "count" });
    expect(count.result.value).toBe(0);

    const percentage = createMetric({ name: "Share", data: [], aggregation: "percentage" });
    expect(percentage.result.value).toBeNull();

    const overflow = createMetric({
      name: "Overflow",
      data: [{ value: 1e308 }, { value: 1e308 }],
      column: "value"
    });
    expect(overflow.result.value).toBeNull();

    expect(() =>
      createMetric({ name: "Bad", data, column: "missing", aggregation: "sum" })
    ).toThrowError(NumvizError);
  });
});

describe("metric comparisons", () => {
  it("compares datasets and exposes difference, percent change and growth", () => {
    const metric = createMetric({
      name: "Revenue",
      data,
      column: "revenue",
      aggregation: "sum",
      format: "currency",
      comparison: { data: previous, column: "revenue", aggregation: "sum" }
    });
    const comparison = metric.result.comparison;
    expect(comparison).not.toBeNull();
    expect(comparison?.value).toBe(800);
    expect(comparison?.formattedValue).toBe("$800.00");
    expect(comparison?.difference).toBe(200);
    expect(comparison?.percentageChange).toBe(25);
    expect(comparison?.growth).toBe(0.25);
    expect(comparison?.direction).toBe("up");
    expect(metric.result.state).toBe("positive");
    expect(metric.result.trend).toBe("up");
  });

  it("compares against a fixed previous value and handles zero", () => {
    const metric = createMetric({
      name: "Revenue",
      data,
      column: "revenue",
      comparison: { value: 1250 }
    });
    expect(metric.result.comparison?.difference).toBe(-250);
    expect(metric.result.comparison?.percentageChange).toBe(-20);
    expect(metric.result.state).toBe("negative");

    const zero = createMetric({
      name: "Revenue",
      data,
      column: "revenue",
      format: "currency",
      comparison: { value: 0 }
    });
    expect(zero.result.comparison?.difference).toBe(1000);
    expect(zero.result.comparison?.formattedDifference).toBe("+$1,000.00");
    expect(zero.result.comparison?.percentageChange).toBeNull();
    expect(zero.result.comparison?.growth).toBeNull();
    expect(zero.result.direction).toBe("up");
  });

  it("supports lower-is-better metrics, flat trends and hidden trends", () => {
    const lower = createMetric({
      name: "Churn",
      data: [{ rate: 0.05 }],
      column: "rate",
      format: "percent",
      positiveDirection: "down",
      comparison: { value: 0.08 }
    });
    expect(lower.result.direction).toBe("down");
    expect(lower.result.state).toBe("positive");

    const flat = createMetric({
      name: "Flat",
      data: [{ value: 10 }],
      column: "value",
      comparison: { value: 10 },
      trend: "flat"
    });
    expect(flat.result.direction).toBe("flat");
    expect(flat.result.trend).toBe("flat");
    expect(flat.result.state).toBe("neutral");

    const hidden = createMetric({
      name: "Hidden",
      data: [{ value: 10 }],
      column: "value",
      comparison: { value: 5 },
      trend: false
    });
    expect(hidden.result.trend).toBeNull();
    expect(hidden.result.state).toBe("neutral");
    expect(hidden.result.comparison?.percentageChange).toBe(100);
  });

  it("handles missing comparison values", () => {
    const metric = createMetric({
      name: "Revenue",
      data,
      column: "revenue",
      comparison: { value: null }
    });
    expect(metric.result.comparison?.value).toBeNull();
    expect(metric.result.comparison?.difference).toBeNull();
    expect(metric.result.direction).toBeNull();
    expect(metric.result.state).toBe("neutral");
    const container = mount();
    createMetric({
      name: "Revenue",
      data,
      column: "revenue",
      comparison: { value: null }
    }).render(container);
    expect(container.querySelector(".numviz-metric__comparison")).toBeNull();
  });
});

describe("metric formatting and metadata", () => {
  it("formats number, currency, percent, compact and custom values", () => {
    expect(
      createMetric({ name: "Money", data, column: "revenue", format: "currency" }).result
        .formattedValue
    ).toBe("$1,000.00");
    expect(
      createMetric({ name: "Share", data, aggregation: "percentage" }).result.formattedValue
    ).toBe("100%");
    expect(
      createMetric({
        name: "Compact",
        data,
        column: "revenue",
        format: "compact"
      }).result.formattedValue
    ).toBe("1K");
    expect(
      createMetric({
        name: "Custom",
        data,
        column: "revenue",
        format: (value) => `${value} units`
      }).result.formattedValue
    ).toBe("1000 units");
    expect(
      createMetric({
        name: "Precise",
        data,
        column: "revenue",
        format: "number",
        formatOptions: { minimumFractionDigits: 3 }
      }).result.formattedValue
    ).toBe("1,000.000");
  });

  it("exposes aggregation, column, counts and comparison metadata", () => {
    const metric = createMetric({
      name: "Revenue",
      data,
      column: "revenue",
      filter: { region: "North" },
      comparison: { data: previous, column: "revenue" }
    });
    expect(metric.result.metadata).toMatchObject({
      aggregation: "sum",
      column: "revenue",
      dataRowCount: 5,
      filteredRowCount: 2,
      validCount: 2,
      missingCount: 0,
      filter: "object"
    });
    expect(metric.result.metadata.comparison).toMatchObject({
      source: "data",
      rowCount: 4
    });
  });
});

describe("metric KPI card", () => {
  it("renders a complete accessible card", () => {
    const container = mount();
    const metric = createMetric({
      name: "Total Revenue",
      data,
      column: "revenue",
      aggregation: "sum",
      format: "currency",
      description: "All regions",
      prefix: "US$",
      suffix: "gross",
      icon: "★",
      color: "#22C55E",
      variant: "highlight",
      comparison: { value: 800, label: "vs last week" }
    }).render(container);

    const root = container.querySelector(".numviz-metric") as HTMLElement;
    expect(root).not.toBeNull();
    expect(root.getAttribute("role")).toBe("group");
    expect(root.getAttribute("aria-label")).toBe("Total Revenue");
    expect(root.classList.contains("numviz-metric--highlight")).toBe(true);
    expect(root.style.getPropertyValue("--nv-metric-accent")).toBe("#22C55E");
    expect(container.querySelector(".numviz-metric__title")?.textContent).toBe("Total Revenue");
    expect(
      Array.from(container.querySelectorAll(".numviz-metric__value-row span")).map(
        (node) => node.textContent
      )
    ).toEqual(["US$", "$1,000.00", "gross"]);
    expect(container.querySelector(".numviz-metric__description")?.textContent).toBe("All regions");
    expect(container.querySelector(".numviz-metric__icon")?.textContent).toBe("★");
    const comparison = container.querySelector(".numviz-metric__comparison") as HTMLElement;
    expect(comparison.dataset.state).toBe("positive");
    expect(comparison.querySelector(".numviz-metric__trend")?.textContent).toBe("↑");
    expect(comparison.querySelector(".numviz-metric__change")?.textContent).toBe("+25%");
    expect(comparison.querySelector(".numviz-metric__comparison-label")?.textContent).toBe(
      "vs last week"
    );
    expect(
      container.querySelector(".numviz-metric__value")?.getAttribute("aria-live")
    ).toBe("polite");
    expect(metric.element).toBe(root);
  });

  it("renders DOM node icons, including nodes from another document", () => {
    const container = mount();
    const icon = document.createElement("strong");
    icon.textContent = "↑";
    createMetric({ name: "Growth", data, column: "revenue", icon }).render(container);
    expect(container.querySelector(".numviz-metric__icon strong")).toBe(icon);

    const frame = document.createElement("iframe");
    document.body.appendChild(frame);
    const frameDoc = frame.contentDocument;
    if (!frameDoc) throw new Error("missing iframe document");
    const frameIcon = frameDoc.createElement("span");
    frameIcon.textContent = "iframe";
    createMetric({ name: "Frame", data, column: "revenue", icon: frameIcon }).render(container);
    expect(container.querySelector(".numviz-metric__icon span")?.textContent).toBe("iframe");
    frame.remove();
  });

  it("renders loading, empty and error appearances", () => {
    const container = mount();
    const metric = createMetric({
      name: "Revenue",
      data,
      column: "revenue",
      format: "currency",
      loading: true
    }).render(container);
    expect(container.querySelector(".numviz-metric--loading")).not.toBeNull();
    expect(container.querySelector(".numviz-metric")?.getAttribute("aria-busy")).toBe("true");
    expect(container.querySelector(".numviz-metric__value")?.textContent).toBe("Loading…");

    metric.setLoading(false);
    expect(container.querySelector(".numviz-metric__value")?.textContent).toBe("$1,000.00");

    metric.setData([]);
    expect(container.querySelector(".numviz-metric--empty")).not.toBeNull();
    expect(container.querySelector(".numviz-metric__empty")?.textContent).toBe("No data");

    metric.setError("Could not load revenue");
    expect(container.querySelector('[role="alert"]')?.textContent).toBe("Could not load revenue");
    expect(container.querySelector(".numviz-metric__value")?.textContent).toBe("—");
    expect(container.querySelector(".numviz-metric")?.getAttribute("aria-busy")).toBe("false");
  });

  it("updates value, theme tokens and variants", () => {
    const container = mount();
    const metric = createMetric({
      name: "Revenue",
      data,
      column: "revenue",
      comparison: { value: 800 },
      theme: { mode: "dark", positive: "#00FF00", danger: "#FF0000" }
    }).render(container);
    const root = container.querySelector(".numviz-metric") as HTMLElement;
    expect(root.style.getPropertyValue("--nv-positive")).toBe("#00FF00");
    expect(root.style.getPropertyValue("--nv-danger")).toBe("#FF0000");

    metric.setData([{ revenue: 900 }, { revenue: 100 }]);
    expect(container.querySelector(".numviz-metric__value")?.textContent).toBe("1,000");
    expect(container.querySelector(".numviz-metric__comparison")).not.toBeNull();

    metric.update({
      name: "Revenue",
      data,
      column: "revenue",
      comparison: { value: 800 },
      variant: "compact"
    });
    expect(container.querySelector(".numviz-metric--compact")).not.toBeNull();
    expect(
      container.querySelector(".numviz-metric__comparison")?.getAttribute("data-state")
    ).toBe("positive");
  });

  it("recomputes on refresh and supports destruction", () => {
    const container = mount();
    const rows = [{ value: 10 }];
    const metric = createMetric({ name: "Value", data: rows, column: "value" }).render(container);
    rows[0] = { value: 20 };
    metric.refresh();
    expect(container.querySelector(".numviz-metric__value")?.textContent).toBe("20");

    metric.destroy();
    expect(container.querySelector(".numviz-metric")).toBeNull();
    expect(metric.isDestroyed).toBe(true);
    expect(() => metric.render(container)).toThrowError(NumvizError);
  });

  it("creates values without rendering", () => {
    const metric = createMetric({ name: "Revenue", data, column: "revenue" });
    expect(metric.result.value).toBe(1000);
    expect(metric.element).toBeNull();
  });
});

describe("metric validation", () => {
  it("rejects invalid configurations", () => {
    const cases: Array<[Record<string, unknown>, string]> = [
      [{ name: "", data, column: "revenue" }, "name"],
      [{ name: "Bad", data, column: "revenue", aggregation: "mode" }, "aggregation"],
      [{ name: "Bad", data, aggregation: "sum" }, "column"],
      [{ name: "Bad", data, column: "revenue", format: "scientific" }, "format"],
      [{ name: "Bad", data, column: "revenue", trend: "sideways" }, "trend"],
      [{ name: "Bad", data, column: "revenue", variant: "fancy" }, "variant"],
      [{ name: "Bad", data, column: "revenue", comparison: {} }, "comparison"],
      [
        {
          name: "Bad",
          data,
          column: "revenue",
          comparison: { value: 1, data }
        },
        "comparison"
      ],
      [{ name: "Bad", data, column: "revenue", icon: 42 }, "icon"]
    ];
    for (const [config, path] of cases) {
      let caught: unknown;
      try {
        createMetric(config as never);
      } catch (error) {
        caught = error;
      }
      expect(caught, String(path)).toBeInstanceOf(NumvizError);
      expect((caught as NumvizError).path).toBe(path);
    }
  });
});
