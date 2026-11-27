import { afterEach, describe, expect, it } from "vitest";
import { createChart, createTable } from "../src/index.js";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("chart export", () => {
  it("serializes a rendered chart to standalone SVG", () => {
    document.body.innerHTML = '<div id="chart"></div>';
    const chart = createChart({
      type: "bar",
      title: "Revenue & <Profit>",
      data: [
        { region: "North", revenue: 120 },
        { region: "South", revenue: 80 }
      ],
      x: "region",
      y: "revenue",
      width: 480,
      height: 300
    }).render("#chart");

    const svg = chart.toSVG();
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('width="480"');
    expect(svg).toContain('height="300"');
    expect(svg).toContain("width: 480px");
    expect(svg).toContain("--nv-background");
    expect(svg).toContain("<style>");
    expect(svg).toContain("Revenue &amp; &lt;Profit&gt;");
    expect(svg).toContain("numviz-chart__mark");
    expect(chart.toSVG({ width: 960, height: 600 })).toContain('width="960"');
    const parsed = new DOMParser().parseFromString(svg, "image/svg+xml");
    expect(parsed.querySelector("parsererror")).toBeNull();
    expect(parsed.documentElement.tagName).toBe("svg");
    chart.destroy();
  });

  it("requires a rendered chart and reports unavailable PNG support", async () => {
    document.body.innerHTML = '<div id="chart"></div>';
    const chart = createChart({
      type: "line",
      data: [{ month: "Jan", value: 2 }],
      x: "month",
      y: "value"
    });
    expect(() => chart.toSVG()).toThrow(/Render the chart/);
    chart.render("#chart");
    await expect(chart.toPNG()).rejects.toMatchObject({ code: "EXPORT_FAILED" });
    chart.destroy();
    expect(() => chart.toSVG()).toThrow(/destroyed/);
  });
});

describe("table export", () => {
  function table() {
    return createTable({
      title: "Accounts",
      data: [
        { name: "Alpha", amount: 1200, note: "first" },
        { name: "Beta", amount: 80, note: "line\nbreak" },
        { name: "Gamma", amount: 40, note: 'quote " here' }
      ],
      columns: [
        { field: "name", label: "Account", searchable: true },
        { field: "amount", label: "Revenue", format: "currency" },
        { field: "note", label: "Note", visible: false }
      ],
      pageSize: 1,
      pagination: true,
      sortable: true
    });
  }

  it("exports CSV with displayed labels, formatting and quoting", () => {
    const instance = table();
    const csv = instance.toCSV();
    expect(csv.split("\n")[0]).toBe("Account,Revenue");
    expect(csv).toContain('Alpha,"$1,200.00"');
    expect(instance.toCSV({ includeHidden: true })).toContain("Note");
    expect(instance.toCSV({ includeHidden: true })).toContain('"line\nbreak"');
    expect(instance.toCSV({ delimiter: ";", includeHeaders: false })).toContain("Alpha;$1,200.00");
    expect(instance.toCSV({ bom: true }).startsWith("\uFEFF")).toBe(true);
    instance.destroy();
  });

  it("exports filtered rows, current pages and JSON forms", () => {
    const instance = table();
    instance.setSearch("Alpha");
    expect(JSON.parse(instance.toJSON({ useLabels: true }))).toEqual([
      { Account: "Alpha", Revenue: "$1,200.00" }
    ]);
    expect(JSON.parse(instance.toJSON({ raw: true }))).toEqual([
      { name: "Alpha", amount: 1200 }
    ]);
    expect(JSON.parse(instance.toJSON({ format: "matrix" }))).toEqual([
      ["Account", "Revenue"],
      ["Alpha", "$1,200.00"]
    ]);
    instance.setSearch("");
    instance.setPage(2);
    expect(JSON.parse(instance.toJSON({ scope: "page" }))).toEqual([
      { name: "Beta", amount: "$80.00" }
    ]);
    instance.destroy();
  });

  it("exports escaped HTML and validates export options", () => {
    const instance = createTable({
      title: "Unsafe <data>",
      data: [{ name: '<script>alert("x")</script>', amount: 10 }],
      columns: [
        { field: "name", label: "Name" },
        { field: "amount", label: "Amount" }
      ]
    });
    const html = instance.toHTML({ includeTitle: true });
    expect(html).toContain("<caption>Unsafe &lt;data&gt;</caption>");
    expect(html).toContain("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
    expect(html).not.toContain("<script>");
    expect(() => instance.toCSV({ scope: "bad" as never })).toThrow(/scope/);
    expect(() => instance.toCSV({ delimiter: "" })).toThrow(/delimiter/);
    expect(() => instance.toJSON({ format: "bad" as never })).toThrow(/format/);
    instance.destroy();
  });
});
