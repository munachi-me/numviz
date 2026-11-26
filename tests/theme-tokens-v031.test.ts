import { beforeEach, describe, expect, it } from "vitest";
import { createChart, createTable, NumvizError } from "../src/index.js";
import { resolveTheme } from "../src/theme/tokens.js";

const overrides = {
  surfaceElevated: "#101820",
  positive: "#00C853",
  warning: "#FFB300",
  danger: "#D50000",
  info: "#0091EA"
};

describe("extended theme tokens", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("resolves custom surface and semantic tokens", () => {
    const tokens = resolveTheme({ mode: "dark", ...overrides });
    expect(tokens.mode).toBe("dark");
    expect(tokens.surfaceElevated).toBe("#101820");
    expect(tokens.positive).toBe("#00C853");
    expect(tokens.warning).toBe("#FFB300");
    expect(tokens.danger).toBe("#D50000");
    expect(tokens.info).toBe("#0091EA");
  });

  it("keeps built-in defaults when tokens are omitted", () => {
    expect(resolveTheme({}).positive).toBe("#059669");
    expect(resolveTheme({ mode: "dark" }).positive).toBe("#34D399");
    expect(resolveTheme({ mode: "dark" }).surfaceElevated).toBe("#1E293B");
  });

  it("applies the tokens as CSS variables on charts and tables", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    createChart({
      type: "bar",
      data: [{ month: "Jan", revenue: 10 }],
      x: "month",
      y: "revenue",
      theme: overrides
    }).render(container);
    const chartRoot = container.querySelector(".numviz-root") as HTMLElement;
    expect(chartRoot.style.getPropertyValue("--nv-surface-elevated")).toBe("#101820");
    expect(chartRoot.style.getPropertyValue("--nv-positive")).toBe("#00C853");
    expect(chartRoot.style.getPropertyValue("--nv-warning")).toBe("#FFB300");
    expect(chartRoot.style.getPropertyValue("--nv-danger")).toBe("#D50000");
    expect(chartRoot.style.getPropertyValue("--nv-info")).toBe("#0091EA");

    const tableHost = document.createElement("div");
    document.body.appendChild(tableHost);
    createTable({ data: [{ value: 1 }], theme: overrides }).render(tableHost);
    const tableRoot = tableHost.querySelector(".numviz-table") as HTMLElement;
    expect(tableRoot.style.getPropertyValue("--nv-surface-elevated")).toBe("#101820");
    expect(tableRoot.style.getPropertyValue("--nv-positive")).toBe("#00C853");
    expect(tableRoot.style.getPropertyValue("--nv-danger")).toBe("#D50000");
  });

  it("validates every new token", () => {
    const paths: Array<[keyof typeof overrides, string]> = [
      ["surfaceElevated", "theme.surfaceElevated"],
      ["positive", "theme.positive"],
      ["warning", "theme.warning"],
      ["danger", "theme.danger"],
      ["info", "theme.info"]
    ];
    for (const [field, path] of paths) {
      let caught: unknown;
      try {
        createChart({
          type: "bar",
          data: [{ month: "Jan", revenue: 10 }],
          x: "month",
          y: "revenue",
          theme: { [field]: "" }
        });
      } catch (error) {
        caught = error;
      }
      expect(caught, field).toBeInstanceOf(NumvizError);
      expect((caught as NumvizError).code).toBe("INVALID_CONFIG");
      expect((caught as NumvizError).path).toBe(path);
    }
  });
});
