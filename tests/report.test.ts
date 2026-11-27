import { afterEach, describe, expect, it, vi } from "vitest";
import Numviz, {
  createReport,
  REPORT_PRESETS,
  type ReportConfig
} from "../src/index.js";

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

function config(type: ReportConfig["type"]): ReportConfig {
  return {
    type,
    metadata: { title: "Quarterly review", author: "Ada", subject: "Revenue" },
    components: [
      {
        id: "revenue",
        type: "metric",
        name: "Revenue",
        data: [{ revenue: 120 }],
        column: "revenue",
        aggregation: "sum"
      },
      {
        id: "chart",
        type: "chart",
        chartType: "bar",
        data: [{ month: "Jan", revenue: 120 }],
        x: "month",
        y: "revenue"
      }
    ]
  };
}

describe("reports", () => {
  it("applies report presets and metadata", () => {
    const report = createReport(config("executive"));
    expect(report.reportType).toBe("executive");
    expect(report.metadata?.author).toBe("Ada");
    expect(report.config.title).toBe("Quarterly review");
    expect(report.config.layout.columns.lg).toBe(4);
    expect(report.config.print).toEqual({ hideFilters: true, pageBreak: "avoid" });
    expect(REPORT_PRESETS.kpi.layout?.variant).toBe("compact");
    expect(Numviz.createReport).toBe(createReport);
    report.destroy();
  });

  it("honours explicit layout and print overrides", () => {
    const report = createReport({
      ...config("analytical"),
      layout: { columns: 2 },
      print: { hideHeader: true, pageBreak: "auto" }
    });
    expect(report.config.layout.columns.lg).toBe(2);
    expect(report.config.print).toEqual({
      hideFilters: true,
      hideHeader: true,
      pageBreak: "auto"
    });
    report.destroy();
  });

  it("prints a rendered report and applies print classes", () => {
    document.body.innerHTML = '<div id="report"></div>';
    const report = createReport(config("kpi")).render("#report");
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    report.print({ hideHeader: true });
    expect(print).toHaveBeenCalledTimes(1);
    expect(report.element?.classList.contains("numviz-dashboard--print-hide-header")).toBe(true);
    expect(report.element?.classList.contains("numviz-dashboard--print-hide-filters")).toBe(true);
    report.destroy();
  });

  it("disables print classes when print is false", () => {
    document.body.innerHTML = '<div id="report"></div>';
    const report = createReport({ ...config("executive"), print: false }).render("#report");
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    report.print();
    expect(print).toHaveBeenCalledTimes(1);
    expect(report.element?.classList.contains("numviz-dashboard--print-hide-filters")).toBe(false);
    expect(report.element?.classList.contains("numviz-dashboard--print-avoid-break")).toBe(false);
    report.destroy();
  });

  it("rejects unknown report types", () => {
    expect(() => createReport({ ...config("executive"), type: "unknown" as never })).toThrow(
      /Unknown report type/
    );
  });
});
