import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import Numviz, { createChart, NumvizError, version } from "../src/index.js";

const data = [
  { month: "Jan", revenue: 120, expenses: 80 },
  { month: "Feb", revenue: 180, expenses: 110 },
  { month: "Mar", revenue: 150, expenses: 95 }
];

function mount(): HTMLDivElement {
  const container = document.createElement("div");
  document.body.appendChild(container);
  return container;
}

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("public API", () => {
  it("exposes the same implementation through default and named imports", () => {
    expect(Numviz.createChart).toBe(createChart);
    expect(Numviz.NumvizError).toBe(NumvizError);
  });

  it("reports the package version", () => {
    const pkg = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8")) as {
      version: string;
    };
    expect(version).toBe(pkg.version);
    expect(Numviz.version).toBe(pkg.version);
  });

  it("exposes a read-only namespace", () => {
    expect(Object.isFrozen(Numviz)).toBe(true);
  });
});

describe("createChart validation", () => {
  it("rejects unknown chart types", () => {
    expect(() => createChart({ type: "treemap" as never, data, x: "month", y: "revenue" })).toThrowError(
      NumvizError
    );
  });

  it("requires data and fields", () => {
    expect(() => createChart({ type: "bar", data: undefined as never, x: "a", y: "b" })).toThrowError(
      /data/i
    );
    expect(() => createChart({ type: "bar", data, x: "", y: "revenue" })).toThrowError(/category/i);
  });

  it("reports unknown fields with the available field list", () => {
    try {
      createChart({ type: "bar", data, x: "quarter", y: "revenue" });
      throw new Error("expected an error");
    } catch (error) {
      expect(error).toBeInstanceOf(NumvizError);
      expect((error as NumvizError).code).toBe("INVALID_CONFIG");
      expect((error as NumvizError).message).toContain("month");
    }
  });

  it("requires a numeric value field", () => {
    expect(() => createChart({ type: "bar", data, x: "month", y: "month" })).toThrowError(
      /numeric/i
    );
  });

  it("validates width and palette", () => {
    expect(() => createChart({ type: "bar", data, x: "month", y: "revenue", width: -4 })).toThrowError(
      /width/i
    );
    expect(() =>
      createChart({ type: "bar", data, x: "month", y: "revenue", palette: [] })
    ).toThrowError(/palette/i);
  });
});

describe("rendering", () => {
  for (const type of ["bar", "line", "pie", "doughnut"] as const) {
    it(`renders a ${type} chart with an SVG`, () => {
      const container = mount();
      const chart = createChart({
        type,
        data,
        x: "month",
        y: "revenue",
        title: "Revenue",
        subtitle: "First quarter"
      });
      chart.render(container);

      const svg = container.querySelector("svg");
      expect(svg).not.toBeNull();
      expect(svg?.getAttribute("role")).toBe("img");
      expect(svg?.getAttribute("aria-label")).toBe("Revenue");
      expect(container.querySelector('[data-numviz-part="title"]')?.textContent).toBe("Revenue");
      expect(container.querySelector('[data-numviz-part="subtitle"]')?.textContent).toBe(
        "First quarter"
      );
      expect(container.querySelectorAll('[data-numviz-part="value-label"]')).toHaveLength(0);
    });
  }

  it("renders bars with accessible marks and a tooltip", () => {
    const container = mount();
    createChart({ type: "bar", data, x: "month", y: "revenue" }).render(container);

    const bars = container.querySelectorAll('[data-numviz-part="bar"]');
    expect(bars).toHaveLength(3);
    expect(bars[0]?.getAttribute("tabindex")).toBe("0");
    expect(bars[0]?.getAttribute("aria-label")).toBe("Jan: revenue: 120");

    const tooltip = container.querySelector(".numviz-tooltip");
    expect(tooltip).not.toBeNull();
    (bars[0] as SVGRectElement).dispatchEvent(new FocusEvent("focus"));
    expect(tooltip?.getAttribute("data-visible")).toBe("true");
    expect(tooltip?.textContent).toContain("Jan");
  });

  it("renders a line path and points", () => {
    const container = mount();
    createChart({ type: "line", data, x: "month", y: "revenue" }).render(container);
    expect(container.querySelector('[data-numviz-part="line"]')).not.toBeNull();
    expect(container.querySelectorAll('[data-numviz-part="point"]')).toHaveLength(3);
  });

  it("renders every category label when there is room", () => {
    const container = mount();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
    createChart({
      type: "bar",
      data: months.map((month, index) => ({ month, revenue: (index + 1) * 100 })),
      x: "month",
      y: "revenue"
    }).render(container);
    const labels = [...container.querySelectorAll('[data-numviz-part="x-axis"] text')].map(
      (node) => node.textContent
    );
    expect(labels).toEqual(months);
  });

  it("renders pie slices and a legend by default", () => {
    const container = mount();
    createChart({ type: "pie", data, x: "month", y: "revenue" }).render(container);
    expect(container.querySelectorAll('[data-numviz-part="slice"]')).toHaveLength(3);
    const legend = container.querySelector('[data-numviz-part="legend"]');
    expect(legend?.textContent).toContain("Jan");
  });

  it("supports data labels", () => {
    const container = mount();
    createChart({
      type: "bar",
      data,
      x: "month",
      y: "revenue",
      labels: { formatter: (value) => `${value} units` }
    }).render(container);
    const labels = container.querySelectorAll('[data-numviz-part="value-label"]');
    expect(labels).toHaveLength(3);
    expect(labels[0]?.textContent).toBe("120 units");
  });

  it("applies palette and theme tokens", () => {
    const container = mount();
    createChart({
      type: "bar",
      data,
      x: "month",
      y: "revenue",
      palette: ["#123456"],
      theme: { mode: "dark", accent: "#abcdef", borderRadius: 4, fontFamily: "Georgia" }
    }).render(container);

    const root = container.querySelector(".numviz-root") as HTMLElement;
    expect(root.style.getPropertyValue("--nv-accent")).toBe("#abcdef");
    expect(root.style.getPropertyValue("--nv-radius")).toBe("4px");
    expect(root.style.getPropertyValue("--nv-font-family")).toBe("Georgia");
    expect(container.querySelector('[data-numviz-part="bar"]')?.getAttribute("fill")).toBe("#123456");
  });

  it("renders an empty state for empty data", () => {
    const container = mount();
    createChart({ type: "bar", data: [], x: "month", y: "revenue" }).render(container);
    expect(container.querySelector('[data-numviz-part="empty"]')?.textContent).toBe(
      "No data to display"
    );
  });

  it("renders an empty state when all values are invalid", () => {
    const container = mount();
    createChart({
      type: "bar",
      data: [{ month: "Jan", revenue: null }],
      x: "month",
      y: "revenue"
    }).render(container);
    expect(container.querySelector('[data-numviz-part="empty"]')).not.toBeNull();
  });

  it("renders into a selector", () => {
    const container = mount();
    container.id = "target";
    createChart({ type: "bar", data, x: "month", y: "revenue" }).render("#target");
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("throws for missing containers", () => {
    const chart = createChart({ type: "bar", data, x: "month", y: "revenue" });
    try {
      chart.render("#nope");
      throw new Error("expected an error");
    } catch (error) {
      expect((error as NumvizError).code).toBe("CONTAINER_NOT_FOUND");
    }
  });

  it("removes rendered output on destroy and rejects reuse", () => {
    const container = mount();
    const chart = createChart({ type: "bar", data, x: "month", y: "revenue" });
    chart.render(container);
    expect(container.querySelector("svg")).not.toBeNull();
    chart.destroy();
    expect(container.querySelector("svg")).toBeNull();
    expect(chart.element).toBeNull();
    expect(chart.isDestroyed).toBe(true);
    try {
      chart.render(container);
      throw new Error("expected an error");
    } catch (error) {
      expect((error as NumvizError).code).toBe("DESTROYED");
    }
  });

  it("can re-render into a new container without duplicating output", () => {
    const first = mount();
    const second = mount();
    const chart = createChart({ type: "bar", data, x: "month", y: "revenue" });
    chart.render(first);
    chart.render(second);
    expect(first.querySelector("svg")).toBeNull();
    expect(second.querySelector("svg")).not.toBeNull();
  });
});
