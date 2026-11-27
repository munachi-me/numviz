import { beforeEach, describe, expect, it } from "vitest";
import { createChart, createDashboard, createMetric, createTable, NumvizError } from "../src/index.js";
import { resolveTheme } from "../src/theme/tokens.js";

const colors = {
  primary: "#7057D9",
  background: "#111318",
  surface: "#1B1E26",
  text: "#FFFFFF",
  mutedText: "#AAB2C8",
  border: "#333A4A",
  grid: "#252B38",
  positive: "#22C55E",
  warning: "#F59E0B",
  danger: "#EF4444",
  info: "#38BDF8"
};

const data = [
  { region: "North", revenue: 100 },
  { region: "South", revenue: 200 }
];

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("theme colour aliases", () => {
  it("maps friendly colour names onto theme tokens", () => {
    const tokens = resolveTheme({ mode: "dark", colors });
    expect(tokens.accent).toBe("#7057D9");
    expect(tokens.background).toBe("#111318");
    expect(tokens.surface).toBe("#1B1E26");
    expect(tokens.text).toBe("#FFFFFF");
    expect(tokens.positive).toBe("#22C55E");
  });

  it("prefers explicit token names over aliases", () => {
    const tokens = resolveTheme({
      colors: { primary: "#111111", background: "#222222" },
      accent: "#333333",
      background: "#444444"
    });
    expect(tokens.accent).toBe("#333333");
    expect(tokens.background).toBe("#444444");
  });

  it("applies aliases to charts, tables, metrics and dashboards", () => {
    const chartHost = document.createElement("div");
    const tableHost = document.createElement("div");
    const metricHost = document.createElement("div");
    const dashboardHost = document.createElement("div");
    document.body.append(chartHost, tableHost, metricHost, dashboardHost);

    createChart({
      type: "bar",
      data,
      x: "region",
      y: "revenue",
      theme: { colors }
    }).render(chartHost);
    const chartRoot = chartHost.querySelector(".numviz-chart") as HTMLElement;
    expect(chartRoot.style.getPropertyValue("--nv-accent")).toBe("#7057D9");
    expect(chartRoot.style.getPropertyValue("--nv-background")).toBe("#111318");

    createTable({ data, theme: { colors } }).render(tableHost);
    const tableRoot = tableHost.querySelector(".numviz-table") as HTMLElement;
    expect(tableRoot.style.getPropertyValue("--nv-accent")).toBe("#7057D9");

    createMetric({
      name: "Revenue",
      data,
      column: "revenue",
      aggregation: "sum",
      theme: { colors }
    }).render(metricHost);
    const metricRoot = metricHost.querySelector(".numviz-metric") as HTMLElement;
    expect(metricRoot.style.getPropertyValue("--nv-accent")).toBe("#7057D9");

    createDashboard({
      theme: { colors },
      components: [
        {
          id: "revenue",
          type: "metric",
          data,
          column: "revenue",
          aggregation: "sum"
        }
      ]
    }).render(dashboardHost);
    const dashboardRoot = dashboardHost.querySelector(".numviz-dashboard") as HTMLElement;
    expect(dashboardRoot.style.getPropertyValue("--nv-accent")).toBe("#7057D9");
  });

  it("validates colour alias names and values", () => {
    expect(() =>
      createChart({
        type: "bar",
        data,
        x: "region",
        y: "revenue",
        theme: { colors: { primary: "" } }
      })
    ).toThrowError(NumvizError);
    try {
      createChart({
        type: "bar",
        data,
        x: "region",
        y: "revenue",
        theme: { colors: { primary: "" } }
      });
    } catch (error) {
      expect((error as NumvizError).path).toBe("theme.colors.primary");
    }
    expect(() =>
      createChart({
        type: "bar",
        data,
        x: "region",
        y: "revenue",
        theme: { colors: "dark" as never }
      })
    ).toThrowError(/theme\.colors/);
  });
});
