import { afterEach, describe, expect, it } from "vitest";
import { createChart, createTable } from "../src/index.js";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("accessibility", () => {
  it("describes charts and reports the selected point", () => {
    document.body.innerHTML = '<div id="chart"></div>';
    const chart = createChart({
      type: "bar",
      title: "Revenue",
      data: [
        { region: "North", revenue: 120 },
        { region: "South", revenue: 80 }
      ],
      x: "region",
      y: "revenue",
      selectedIndex: 1
    }).render("#chart");

    const svg = document.querySelector("svg.numviz-chart__svg");
    expect(svg?.getAttribute("role")).toBe("img");
    expect(svg?.getAttribute("aria-label")).toBe("Revenue");
    expect(svg?.querySelector("title")?.textContent).toBe("Revenue");
    expect(svg?.querySelector("desc")?.textContent).toContain("2 points");
    expect(chart.getSummary()).toContain("A bar chart of revenue by region");
    expect(chart.getSummary()).toContain("Selected index 1");
    chart.destroy();
  });

  it("keeps table semantics for large datasets", () => {
    document.body.innerHTML = '<div id="table"></div>';
    const rows = Array.from({ length: 2000 }, (_, index) => ({
      id: index + 1,
      name: `Account ${index + 1}`,
      revenue: index * 10
    }));
    const table = createTable({
      data: rows,
      pagination: true,
      pageSize: 20,
      sortable: true,
      searchable: true
    }).render("#table");

    expect(document.querySelectorAll("tbody tr")).toHaveLength(20);
    expect(document.querySelector("table")?.querySelector("caption")).not.toBeNull();
    expect(document.querySelector("th")?.getAttribute("scope")).toBe("col");
    expect(document.querySelector("th")?.getAttribute("aria-sort")).toBe("none");
    expect(document.querySelector('[aria-live="polite"]')).not.toBeNull();
    expect(table.toCSV().trim().split("\n")).toHaveLength(2001);
    table.destroy();
  });
});

describe("large chart rendering", () => {
  it("renders and exports a chart with many points", () => {
    document.body.innerHTML = '<div id="chart"></div>';
    const data = Array.from({ length: 1200 }, (_, index) => ({
      month: `M${index}`,
      revenue: index * 2
    }));
    const chart = createChart({
      type: "line",
      data,
      x: "month",
      y: "revenue",
      labels: false,
      width: 900,
      height: 320
    }).render("#chart");

    expect(document.querySelectorAll(".numviz-chart__mark")).toHaveLength(1200);
    expect(chart.getSummary()).toContain("1200 points");
    expect(chart.toSVG()).toContain("numviz-chart__mark");
    chart.destroy();
  });
});
