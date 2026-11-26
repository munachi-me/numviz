import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createChart, type ChartConfig, type ChartClickEvent } from "../src/index.js";

const months = [
  { month: "Jan", revenue: 120, expenses: 80, active: 200, day: "2026-01-05" },
  { month: "Feb", revenue: 180, expenses: 110, active: 260, day: "2026-01-12" },
  { month: "Mar", revenue: 150, expenses: 95, active: 300, day: "2026-01-20" }
];

const scatterData = [
  { weight: 10, score: 4 },
  { weight: 20, score: 7 },
  { weight: 30, score: 9 }
];

const twoSeries = [
  { field: "revenue", label: "Revenue", color: "#111111" },
  { field: "expenses", label: "Expenses", color: "#222222" }
];

function mount(): HTMLDivElement {
  const container = document.createElement("div");
  document.body.appendChild(container);
  return container;
}

function select(container: Element, selector: string): Element[] {
  return [...container.querySelectorAll(selector)];
}

function configFor(type: ChartConfig["type"]): ChartConfig {
  if (type === "scatter") {
    return { type, data: scatterData, x: "weight", y: "score" };
  }
  if (type === "histogram") {
    return { type, data: months, y: "revenue", bins: 4 };
  }
  if (type === "radar") {
    return { type, data: months, x: "month", y: "revenue", series: twoSeries };
  }
  if (type === "grouped-bar" || type === "stacked-bar" || type === "area") {
    return { type, data: months, x: "month", y: "revenue", series: twoSeries };
  }
  return { type, data: months, x: "month", y: "revenue" };
}

beforeEach(() => {
  document.body.innerHTML = "";
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("0.2 chart types", () => {
  for (const type of [
    "area",
    "stacked-bar",
    "grouped-bar",
    "horizontal-bar",
    "scatter",
    "histogram",
    "radar"
  ] as const) {
    it(`renders a ${type} chart`, () => {
      const container = mount();
      createChart({ ...configFor(type), title: type }).render(container);
      expect(container.querySelector("svg")).not.toBeNull();
      expect(container.querySelectorAll(".numviz-chart__mark").length).toBeGreaterThan(0);
      expect(container.querySelector('[data-numviz-part="title"]')?.textContent).toBe(type);
    });
  }

  it("renders grouped bars for each series with per-series colours", () => {
    const container = mount();
    createChart(configFor("grouped-bar")).render(container);
    const bars = select(container, '[data-numviz-part="bar"]');
    expect(bars).toHaveLength(6);
    expect(new Set(bars.map((bar) => bar.getAttribute("fill")))).toEqual(
      new Set(["#111111", "#222222"])
    );
    const legend = container.querySelector('[data-numviz-part="legend"]');
    expect(legend?.textContent).toContain("Revenue");
    expect(legend?.textContent).toContain("Expenses");
  });

  it("stacks bars within a category", () => {
    const container = mount();
    createChart(configFor("stacked-bar")).render(container);
    const bars = select(container, '[data-numviz-part="bar"]');
    expect(bars).toHaveLength(6);
    const january = bars.filter((bar) => bar.getAttribute("data-index") === "0");
    expect(january).toHaveLength(2);
    const heights = january.map((bar) => Number(bar.getAttribute("height")));
    expect(heights.every((height) => height > 0)).toBe(true);
  });

  it("renders horizontal bars with a category axis", () => {
    const container = mount();
    createChart(configFor("horizontal-bar")).render(container);
    expect(container.querySelectorAll('[data-numviz-part="bar"]')).toHaveLength(3);
    const yAxis = container.querySelector('[data-numviz-part="y-axis"]');
    expect(yAxis?.textContent).toContain("Jan");
  });

  it("bin counts follow the bins option", () => {
    const container = mount();
    createChart({ type: "histogram", data: months, y: "revenue", bins: 3 }).render(container);
    expect(container.querySelectorAll('[data-numviz-part="bar"]')).toHaveLength(3);
  });

  it("renders multi-series line and area paths", () => {
    const container = mount();
    createChart({ type: "area", data: months, x: "month", y: "revenue", series: twoSeries }).render(
      container
    );
    expect(container.querySelectorAll('[data-numviz-part="line"]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-numviz-part="area"]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-numviz-part="point"]')).toHaveLength(6);
  });

  it("renders scatter points from numeric x and y fields", () => {
    const container = mount();
    createChart(configFor("scatter")).render(container);
    expect(container.querySelectorAll('[data-numviz-part="point"]')).toHaveLength(3);
    expect(container.querySelector('[data-numviz-part="x-axis"]')?.textContent).toContain("10");
  });

  it("formats date scatter axes as dates", () => {
    const container = mount();
    createChart({
      type: "scatter",
      data: months,
      x: "day",
      y: "revenue"
    }).render(container);
    const axisText = container.querySelector('[data-numviz-part="x-axis"]')?.textContent ?? "";
    expect(axisText).toMatch(/2026-/);
  });

  it("rejects non-numeric scatter x fields", () => {
    expect(() =>
      createChart({ type: "scatter", data: months, x: "month", y: "revenue" })
    ).toThrowError(/numeric or date/i);
  });

  it("renders radar series as polygons", () => {
    const container = mount();
    createChart(configFor("radar")).render(container);
    expect(container.querySelectorAll('[data-numviz-part="radar-area"]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-numviz-part="radar-grid"] circle')).toHaveLength(4);
  });

  it("explains when radar has too few categories", () => {
    const container = mount();
    createChart({
      type: "radar",
      data: [
        { month: "Jan", revenue: 10 },
        { month: "Feb", revenue: 20 }
      ],
      x: "month",
      y: "revenue"
    }).render(container);
    expect(container.querySelector('[data-numviz-part="empty"]')?.textContent).toBe(
      "Not enough data to display"
    );
  });
});

describe("axes", () => {
  it("renders axis titles, rotated labels and formatted ticks", () => {
    const container = mount();
    createChart({
      type: "bar",
      data: months,
      x: "month",
      y: "revenue",
      xAxis: { title: "Month", rotate: 45, tickFormat: (value) => String(value).toUpperCase() },
      yAxis: { title: "Revenue", tickFormat: (value) => `$${value}` }
    }).render(container);

    expect(container.querySelector('[data-numviz-part="x-axis-title"]')?.textContent).toBe("Month");
    expect(container.querySelector('[data-numviz-part="y-axis-title"]')?.textContent).toBe(
      "Revenue"
    );
    const xLabels = select(container, '[data-numviz-part="x-axis"] text');
    expect(xLabels[0]?.textContent).toBe("JAN");
    expect(xLabels[0]?.getAttribute("transform")).toContain("rotate(-45");
    expect(container.querySelector('[data-numviz-part="y-axis"]')?.textContent).toContain("$");
  });

  it("hides axes when configured", () => {
    const container = mount();
    createChart({
      type: "bar",
      data: months,
      x: "month",
      y: "revenue",
      xAxis: { show: false },
      yAxis: { show: false }
    }).render(container);
    expect(container.querySelector('[data-numviz-part="x-axis"]')).toBeNull();
    expect(container.querySelector('[data-numviz-part="y-axis"]')).toBeNull();
  });

  it("respects numeric domain bounds", () => {
    const container = mount();
    createChart({
      type: "bar",
      data: months,
      x: "month",
      y: "revenue",
      yAxis: { min: 0, max: 100, tickFormat: (value) => `v${value}` }
    }).render(container);
    const text = container.querySelector('[data-numviz-part="y-axis"]')?.textContent ?? "";
    expect(text).toContain("v100");
  });

  it("can disable grid lines", () => {
    const container = mount();
    createChart({
      type: "bar",
      data: months,
      x: "month",
      y: "revenue",
      yAxis: { grid: false }
    }).render(container);
    expect(container.querySelectorAll(".numviz-chart__grid-line")).toHaveLength(0);
  });
});

describe("interactions", () => {
  it("calls onClick with series context and keyboard activation", () => {
    const events: ChartClickEvent[] = [];
    const container = mount();
    createChart({
      type: "grouped-bar",
      data: months,
      x: "month",
      y: "revenue",
      series: twoSeries,
      onClick: (event) => events.push(event)
    }).render(container);

    const bars = select(container, '[data-numviz-part="bar"]');
    bars[0]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: "grouped-bar",
      label: "Jan",
      field: "revenue",
      series: "Revenue",
      value: 120,
      index: 0
    });

    bars[1]?.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    );
    expect(events).toHaveLength(2);
    expect(events[1]?.field).toBe("expenses");
  });

  it("toggles series through the legend", () => {
    const container = mount();
    createChart({
      type: "line",
      data: months,
      x: "month",
      y: "revenue",
      series: twoSeries
    }).render(container);
    expect(container.querySelectorAll('[data-numviz-part="point"]')).toHaveLength(6);

    container
      .querySelector('[data-numviz-part="legend-item"][data-index="1"]')
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(container.querySelectorAll('[data-numviz-part="point"]')).toHaveLength(3);
    expect(
      container
        .querySelector('[data-numviz-part="legend-item"][data-index="1"]')
        ?.getAttribute("aria-pressed")
    ).toBe("false");

    container
      .querySelector('[data-numviz-part="legend-item"][data-index="1"]')
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(container.querySelectorAll('[data-numviz-part="point"]')).toHaveLength(6);
  });

  it("hides a series through the chart API", () => {
    const container = mount();
    const chart = createChart({
      type: "grouped-bar",
      data: months,
      x: "month",
      y: "revenue",
      series: twoSeries
    });
    chart.render(container);
    expect(container.querySelectorAll('[data-numviz-part="bar"]')).toHaveLength(6);
    chart.setSeriesVisible(0, false);
    expect(container.querySelectorAll('[data-numviz-part="bar"]')).toHaveLength(3);
    expect(container.querySelectorAll('[data-series="0"]')).toHaveLength(0);
    chart.setSeriesVisible(0, true);
    expect(container.querySelectorAll('[data-numviz-part="bar"]')).toHaveLength(6);
  });

  it("uses tooltip formatters with series information", () => {
    const contexts: unknown[] = [];
    const container = mount();
    createChart({
      type: "grouped-bar",
      data: months,
      x: "month",
      y: "revenue",
      series: twoSeries,
      tooltip: {
        formatter: (value, context) => {
          contexts.push(context);
          return `#${value}`;
        }
      }
    }).render(container);

    const bar = container.querySelector('[data-numviz-part="bar"]');
    bar?.dispatchEvent(new FocusEvent("focus"));
    expect(contexts[0]).toMatchObject({ label: "Jan", field: "revenue", series: "Revenue" });
    expect(container.querySelector(".numviz-tooltip")?.textContent).toContain("#120");
  });

  it("dims other categories on focus", () => {
    const container = mount();
    createChart({
      type: "grouped-bar",
      data: months,
      x: "month",
      y: "revenue",
      series: twoSeries
    }).render(container);
    const bars = select(container, '[data-numviz-part="bar"]');
    bars[0]?.dispatchEvent(new FocusEvent("focus"));
    const dimmed = container.querySelectorAll(".numviz-chart__mark--dimmed");
    expect(dimmed.length).toBe(4);
    bars[0]?.dispatchEvent(new FocusEvent("blur"));
    expect(container.querySelectorAll(".numviz-chart__mark--dimmed")).toHaveLength(0);
  });

  it("places labels inside bars when configured", () => {
    const container = mount();
    createChart({
      type: "bar",
      data: months,
      x: "month",
      y: "revenue",
      labels: { position: "inside" }
    }).render(container);
    const label = container.querySelector('[data-numviz-part="value-label"]');
    expect(label?.getAttribute("fill")).toBe("#FFFFFF");
  });
});

describe("responsiveness and animation", () => {
  it("uses the container width when no width is configured", () => {
    const container = mount();
    Object.defineProperty(container, "clientWidth", { value: 480, configurable: true });
    createChart({ type: "bar", data: months, x: "month", y: "revenue" }).render(container);
    expect(container.querySelector("svg")?.getAttribute("viewBox")).toBe("0 0 480 380");
  });

  it("keeps an explicit width", () => {
    const container = mount();
    Object.defineProperty(container, "clientWidth", { value: 480, configurable: true });
    createChart({ type: "bar", data: months, x: "month", y: "revenue", width: 720 }).render(
      container
    );
    expect(container.querySelector("svg")?.getAttribute("viewBox")).toBe("0 0 720 380");
  });

  it("re-renders when a responsive container changes size", async () => {
    const state: { notify?: () => void } = {};
    class MockResizeObserver {
      constructor(callback: () => void) {
        state.notify = callback;
      }
      observe(): void {}
      disconnect(): void {}
    }
    vi.stubGlobal("ResizeObserver", MockResizeObserver);

    const container = mount();
    Object.defineProperty(container, "clientWidth", { value: 480, configurable: true });
    createChart({ type: "bar", data: months, x: "month", y: "revenue" }).render(container);
    expect(container.querySelector("svg")?.getAttribute("viewBox")).toBe("0 0 480 380");

    Object.defineProperty(container, "clientWidth", { value: 640, configurable: true });
    state.notify?.();
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(container.querySelector("svg")?.getAttribute("viewBox")).toBe("0 0 640 380");
  });

  it("exposes animation configuration on the root", () => {
    const container = mount();
    createChart({
      type: "bar",
      data: months,
      x: "month",
      y: "revenue",
      animation: false
    }).render(container);
    const root = container.querySelector(".numviz-root") as HTMLElement;
    expect(root.dataset.nvAnimation).toBe("off");
  });
});
