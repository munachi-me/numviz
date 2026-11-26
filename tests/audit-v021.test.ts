import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { normalizeData } from "../src/data/normalize.js";
import {
  createChart,
  NumvizError,
  type ChartConfig,
  type NumvizErrorCode
} from "../src/index.js";

const rows = [
  { month: "Jan", revenue: 120 },
  { month: "Feb", revenue: 180 },
  { month: "Mar", revenue: 150 }
];

const base: ChartConfig = { type: "bar", data: rows, x: "month", y: "revenue" };

function mount(): HTMLDivElement {
  const container = document.createElement("div");
  document.body.appendChild(container);
  return container;
}

function expectConfigError(config: ChartConfig, path: string, code: NumvizErrorCode = "INVALID_CONFIG") {
  let caught: unknown;
  try {
    createChart(config);
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(NumvizError);
  const error = caught as NumvizError;
  expect(error.code).toBe(code);
  expect(error.path).toBe(path);
}

describe("cross-platform build scripts", () => {
  const pkg = JSON.parse(readFileSync(path.resolve("package.json"), "utf8")) as {
    scripts: Record<string, string>;
  };

  it("does not use Unix-only rm commands in build scripts", () => {
    for (const [name, script] of Object.entries(pkg.scripts)) {
      expect(script, `scripts.${name}`).not.toMatch(/\brm\s+-rf\b/);
      expect(script, `scripts.${name}`).not.toMatch(/(^|&&|;)\s*rm\s/);
    }
    expect(pkg.scripts.build).toBe("node scripts/clean.mjs && tsc -p tsconfig.build.json");
  });

  it("cleans nested build output through Node filesystem APIs", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "numviz-clean-"));
    const dist = path.join(root, "dist");
    try {
      mkdirSync(path.join(dist, "nested"), { recursive: true });
      writeFileSync(path.join(dist, "nested", "index.js"), "export {};\n");
      const modulePath = pathToFileURL(path.resolve("scripts/clean.mjs")).href;
      const { clean } = (await import(modulePath)) as { clean: (targets: string[]) => void };
      clean([dist]);
      expect(existsSync(dist)).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("runs clean.mjs directly on any platform", () => {
    const root = mkdtempSync(path.join(tmpdir(), "numviz-clean-cli-"));
    const output = path.join(root, "build");
    try {
      mkdirSync(output, { recursive: true });
      writeFileSync(path.join(output, "file.txt"), "x");
      execFileSync(process.execPath, [path.resolve("scripts/clean.mjs"), output], {
        stdio: "pipe"
      });
      expect(existsSync(output)).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("configuration validation", () => {
  it("rejects non-object theme string tokens", () => {
    expectConfigError({ ...base, theme: { accent: "" } }, "theme.accent");
    expectConfigError({ ...base, theme: { fontFamily: "   " } }, "theme.fontFamily");
    expectConfigError({ ...base, theme: { background: 3 as never } }, "theme.background");
  });

  it("rejects invalid theme palette and radius", () => {
    expectConfigError({ ...base, theme: { chartPalette: [] } }, "theme.chartPalette");
    expectConfigError({ ...base, theme: { chartPalette: ["#fff", ""] } }, "theme.chartPalette[1]");
    expectConfigError({ ...base, theme: { borderRadius: -2 } }, "theme.borderRadius");
    expectConfigError({ ...base, theme: { borderRadius: Number.NaN } }, "theme.borderRadius");
  });

  it("rejects invalid legend values", () => {
    expectConfigError({ ...base, legend: { show: "yes" as never } }, "legend.show");
    expectConfigError({ ...base, legend: { interactive: 1 as never } }, "legend.interactive");
    expectConfigError({ ...base, legend: { position: "middle" as never } }, "legend.position");
  });

  it("rejects invalid label values and formatters", () => {
    expectConfigError({ ...base, labels: { show: "on" as never } }, "labels.show");
    expectConfigError({ ...base, labels: { position: "below" as never } }, "labels.position");
    expectConfigError({ ...base, labels: { formatter: "nope" as never } }, "labels.formatter");
  });

  it("rejects invalid tooltip values and formatters", () => {
    expectConfigError({ ...base, tooltip: { show: 1 as never } }, "tooltip.show");
    expectConfigError({ ...base, tooltip: { formatter: {} as never } }, "tooltip.formatter");
  });

  it("rejects invalid animation values", () => {
    expectConfigError({ ...base, animation: { enabled: "yes" as never } }, "animation.enabled");
    expectConfigError({ ...base, animation: { duration: -1 } }, "animation.duration");
    expectConfigError({ ...base, animation: { duration: Number.POSITIVE_INFINITY } }, "animation.duration");
  });

  it("rejects invalid responsive values", () => {
    expectConfigError({ ...base, responsive: "yes" as never }, "responsive");
  });

  it("rejects malformed series arrays", () => {
    expectConfigError({ ...base, series: {} as never }, "series");
    expectConfigError({ ...base, series: [] }, "series");
    expectConfigError({ ...base, series: [{ field: "" }] }, "series[0]");
    expectConfigError({ ...base, series: [{ field: "revenue", label: "" }] }, "series[0].label");
    expectConfigError({ ...base, series: [{ field: "revenue", color: "" }] }, "series[0].color");
    expectConfigError(
      { ...base, series: [{ field: "revenue" }, { field: "revenue" }] },
      "series[1].field"
    );
  });

  it("rejects invalid axis callback and bounds", () => {
    expectConfigError({ ...base, yAxis: { tickFormat: "x" as never } }, "yAxis.tickFormat");
    expectConfigError({ ...base, yAxis: { title: "" } }, "yAxis.title");
    expectConfigError({ ...base, xAxis: { rotate: 120 } }, "xAxis.rotate");
    expectConfigError({ ...base, yAxis: { min: 10, max: 5 } }, "yAxis");
  });

  it("rejects a non-function onClick handler", () => {
    expectConfigError({ ...base, onClick: "handler" as never }, "onClick");
  });

  it("keeps valid configurations working", () => {
    const chart = createChart({
      ...base,
      theme: { mode: "dark", accent: "#22D3EE", chartPalette: ["#22D3EE"], borderRadius: 6 },
      legend: { show: true, position: "bottom", interactive: false },
      labels: { show: true, position: "inside", formatter: (value) => String(value) },
      tooltip: { show: true, formatter: (value) => String(value) },
      animation: { enabled: false, duration: 0 },
      responsive: false,
      series: [{ field: "revenue" }],
      xAxis: { tickFormat: (value) => String(value) },
      yAxis: { tickFormat: (value) => String(value) },
      onClick: () => undefined
    });
    const container = mount();
    chart.render(container);
    expect(container.querySelector("svg")).not.toBeNull();
  });
});

describe("declared columns and missing cells", () => {
  it("keeps declared columns that records omit", () => {
    const data = normalizeData([{ month: "Jan", revenue: 10 }], ["month", "revenue", "plan"]);
    expect(data.columns.map((column) => column.key)).toEqual(["month", "revenue", "plan"]);
    expect(data.rows[0]?.values.plan).toBeNull();
    expect(data.columns[2]?.label).toBe("plan");
  });

  it("keeps declared dataset columns in declared order", () => {
    const data = normalizeData({
      columns: ["plan", "month", "revenue"],
      rows: [{ month: "Jan", revenue: 10, extra: true }]
    });
    expect(data.columns.map((column) => column.key)).toEqual([
      "plan",
      "month",
      "revenue",
      "extra"
    ]);
    expect(data.rows[0]?.values.plan).toBeNull();
  });

  it("preserves declared columns for empty record sets", () => {
    const data = normalizeData([], ["month", "revenue"]);
    expect(data.columns.map((column) => column.key)).toEqual(["month", "revenue"]);
    expect(data.empty).toBe(true);
  });

  it("converts missing cells in short rows to null", () => {
    const data = normalizeData(
      [
        ["Jan", 10],
        ["Feb"]
      ],
      ["month", "revenue"]
    );
    expect(data.rows[1]?.values.month).toBe("Feb");
    expect(data.rows[1]?.values.revenue).toBeNull();
  });

  it("rejects rows with more values than declared columns", () => {
    let caught: unknown;
    try {
      normalizeData(
        [
          ["Jan", 10, 99]
        ],
        ["month", "revenue"]
      );
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(NumvizError);
    const error = caught as NumvizError;
    expect(error.code).toBe("INVALID_DATA");
    expect(error.message).toMatch(/extra values would be discarded/i);
    expect(error.details).toMatchObject({ row: 0, expected: 2, received: 3 });
  });

  it("renders charts when a declared column has no data", () => {
    const container = mount();
    const chart = createChart({
      type: "bar",
      data: [{ month: "Jan", revenue: 10 }],
      columns: ["month", "revenue", "plan"],
      x: "month",
      y: "revenue"
    });
    chart.render(container);
    expect(chart.data.columns.map((column) => column.key)).toContain("plan");
    expect(container.querySelectorAll('[data-numviz-part="bar"]')).toHaveLength(1);
  });
});

describe("cross-document rendering", () => {
  function createFrame(): { frame: HTMLIFrameElement; doc: Document; container: HTMLDivElement } {
    const frame = document.createElement("iframe");
    document.body.appendChild(frame);
    const doc = frame.contentDocument;
    if (!doc) throw new Error("jsdom did not provide an iframe document");
    const container = doc.createElement("div");
    doc.body.appendChild(container);
    return { frame, doc, container };
  }

  it("renders into the target element's document and injects styles there", () => {
    const { frame, doc, container } = createFrame();
    const parentStyleBefore = document.getElementById("numviz-base-styles");

    createChart({ ...base, width: 500 }).render(container);

    expect(container.querySelector("svg")).not.toBeNull();
    expect(doc.getElementById("numviz-base-styles")).not.toBeNull();
    expect(doc.body.contains(container.firstElementChild)).toBe(true);
    expect(document.getElementById("numviz-base-styles")).toBe(parentStyleBefore);
    frame.remove();
  });

  it("measures the container inside an iframe", () => {
    const { frame, container } = createFrame();
    Object.defineProperty(container, "clientWidth", { value: 512, configurable: true });
    createChart(base).render(container);
    expect(container.querySelector("svg")?.getAttribute("viewBox")).toBe("0 0 512 380");
    frame.remove();
  });

  it("uses the iframe window for system theme detection", () => {
    const { frame, doc, container } = createFrame();
    const view = doc.defaultView;
    if (!view) throw new Error("iframe has no window");
    Object.defineProperty(view, "matchMedia", {
      configurable: true,
      value: (query: string) => ({ matches: query.includes("dark"), media: query })
    });

    createChart({ ...base, theme: { mode: "system" } }).render(container);
    const root = container.querySelector(".numviz-root") as HTMLElement;
    expect(root.style.getPropertyValue("--nv-background").trim()).toBe("#0B1120");
    expect(root.dataset.numvizType).toBe("bar");
    frame.remove();
  });

  it("uses the iframe window's ResizeObserver", () => {
    const { frame, doc, container } = createFrame();
    const view = doc.defaultView;
    if (!view) throw new Error("iframe has no window");
    let constructed = 0;
    class FrameObserver {
      constructor() {
        constructed += 1;
      }
      observe(): void {}
      disconnect(): void {}
    }
    Object.defineProperty(view, "ResizeObserver", {
      configurable: true,
      value: FrameObserver
    });

    const chart = createChart(base);
    chart.render(container);
    expect(constructed).toBe(1);
    chart.destroy();
    frame.remove();
  });
});
