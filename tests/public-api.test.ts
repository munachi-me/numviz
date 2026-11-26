import { describe, expect, it } from "vitest";
import Numviz, {
  createChart,
  createMetric,
  createTable,
  isNumvizError,
  NumvizError,
  version,
  type Chart,
  type Metric,
  type MetricConfig,
  type NumvizNamespace,
  type Table,
  type TableConfig
} from "../src/index.js";

describe("root public API", () => {
  it("exposes named functions and the frozen default namespace", () => {
    expect(typeof createChart).toBe("function");
    expect(typeof createTable).toBe("function");
    expect(typeof createMetric).toBe("function");
    expect(Numviz.createChart).toBe(createChart);
    expect(Numviz.createTable).toBe(createTable);
    expect(Numviz.createMetric).toBe(createMetric);
    expect(Numviz.version).toBe(version);
    expect(Numviz.NumvizError).toBe(NumvizError);
    expect(Object.isFrozen(Numviz)).toBe(true);
    expect(Object.keys(Numviz).sort()).toEqual([
      "NumvizError",
      "createChart",
      "createMetric",
      "createTable",
      "version"
    ]);
  });

  it("supports typed named and namespace creation for all three APIs", () => {
    const api: NumvizNamespace = Numviz;
    const chartConfig = {
      type: "bar" as const,
      data: [{ month: "Jan", revenue: 120 }],
      x: "month",
      y: "revenue"
    };
    const tableConfig: TableConfig = {
      data: [{ name: "Ada", salary: 120000 }],
      columns: [{ field: "name" }, { field: "salary", format: "currency" }]
    };
    const metricConfig: MetricConfig = {
      name: "Revenue",
      data: [{ revenue: 120 }, { revenue: 80 }],
      column: "revenue",
      aggregation: "sum"
    };

    const chart: Chart = createChart(chartConfig);
    const table: Table = createTable(tableConfig);
    const metric: Metric = createMetric(metricConfig);
    const namespaceChart: Chart = api.createChart(chartConfig);
    const namespaceTable: Table = api.createTable(tableConfig);
    const namespaceMetric: Metric = api.createMetric(metricConfig);

    expect(chart.data.rows).toHaveLength(1);
    expect(table.getState().totalRowCount).toBe(1);
    expect(metric.result.value).toBe(200);
    expect(namespaceChart.config.type).toBe("bar");
    expect(namespaceTable.config.columns).toHaveLength(2);
    expect(namespaceMetric.result.formattedValue).toBe("200");

    namespaceChart.destroy();
    namespaceTable.destroy();
    namespaceMetric.destroy();
    table.destroy();
    metric.destroy();
  });

  it("keeps NumvizError helpers available from the root entry", () => {
    const error = new NumvizError("Failed", { code: "INVALID_CONFIG" });
    expect(isNumvizError(error)).toBe(true);
    expect(error.code).toBe("INVALID_CONFIG");
  });
});
