import { describe, expect, it } from "vitest";
import { normalizeData } from "../src/data/normalize.js";
import { NumvizError } from "../src/errors.js";

describe("normalizeData", () => {
  it("normalizes arrays of objects and infers column types", () => {
    const source = [
      { month: "Jan", revenue: "1200", active: "true", launched: "2026-01-15" },
      { month: "Feb", revenue: 1800, active: false, launched: "2026-02-20" }
    ];

    const data = normalizeData(source);

    expect(data.empty).toBe(false);
    expect(data.columns).toEqual([
      { key: "month", label: "month", type: "string" },
      { key: "revenue", label: "revenue", type: "number" },
      { key: "active", label: "active", type: "boolean" },
      { key: "launched", label: "launched", type: "date" }
    ]);
    expect(data.rows[0]?.values.revenue).toBe(1200);
    expect(data.rows[1]?.values.revenue).toBe(1800);
    expect(data.rows[0]?.values.active).toBe(true);
    expect(data.rows[1]?.values.active).toBe(false);
    expect(data.rows[0]?.values.launched).toBeInstanceOf(Date);
  });

  it("never mutates the source data", () => {
    const source = [{ month: "Jan", revenue: "1200" }];
    const snapshot = JSON.parse(JSON.stringify(source));
    normalizeData(source);
    expect(source).toEqual(snapshot);
    expect(source[0]?.revenue).toBe("1200");
  });

  it("keeps the source reference and row sources", () => {
    const source = [{ month: "Jan", revenue: 1200 }];
    const data = normalizeData(source);
    expect(data.source).toBe(source);
    expect(data.rows[0]?.source).toBe(source[0]);
  });

  it("treats missing and invalid values as null", () => {
    const data = normalizeData([
      { label: "a", value: 10 },
      { label: "b", value: null },
      { label: "c", value: "not-a-number" },
      { label: "d", value: 30 }
    ]);
    expect(data.columns.find((column) => column.key === "value")?.type).toBe("number");
    expect(data.rows[1]?.values.value).toBeNull();
    expect(data.rows[2]?.values.value).toBeNull();
    expect(data.rows[3]?.values.value).toBe(30);
  });

  it("accepts arrays of arrays with column definitions", () => {
    const data = normalizeData(
      [
        ["Jan", "1200"],
        ["Feb", "900"]
      ],
      ["month", { key: "revenue", label: "Revenue", type: "number" }]
    );
    expect(data.columns).toEqual([
      { key: "month", label: "month", type: "string" },
      { key: "revenue", label: "Revenue", type: "number" }
    ]);
    expect(data.rows[1]?.values.revenue).toBe(900);
  });

  it("rejects arrays of arrays without column definitions", () => {
    expect(() => normalizeData([["Jan", 10]])).toThrowError(NumvizError);
    try {
      normalizeData([["Jan", 10]]);
    } catch (error) {
      expect((error as NumvizError).code).toBe("INVALID_DATA");
    }
  });

  it("accepts Numiq-like datasets", () => {
    const withRows = normalizeData({
      columns: ["month", { key: "revenue", type: "number" }],
      rows: [
        ["Jan", 10],
        ["Feb", 20]
      ]
    });
    expect(withRows.rows).toHaveLength(2);
    expect(withRows.rows[1]?.values.revenue).toBe(20);

    const withData = normalizeData({
      data: [{ month: "Jan", revenue: 10 }]
    });
    expect(withData.rows[0]?.values.revenue).toBe(10);
  });

  it("normalizes empty datasets", () => {
    const data = normalizeData([]);
    expect(data.empty).toBe(true);
    expect(data.rows).toEqual([]);
  });

  it("rejects unsupported input shapes", () => {
    expect(() => normalizeData({ foo: "bar" } as never)).toThrowError(NumvizError);
  });

  it("rejects duplicate column keys", () => {
    expect(() => normalizeData([["Jan", 10]], ["month", "month"])).toThrowError(NumvizError);
  });

  it("stringifies mixed columns", () => {
    const data = normalizeData([{ label: 1 }, { label: "two" }]);
    expect(data.columns[0]?.type).toBe("string");
    expect(data.rows[0]?.values.label).toBe("1");
  });
});
