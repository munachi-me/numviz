import { beforeEach, describe, expect, it } from "vitest";
import { createChart, NumvizError } from "../src/index.js";

const first = [
  { month: "Jan", revenue: 120 },
  { month: "Feb", revenue: 180 }
];

const second = [
  { month: "Mar", revenue: 240 },
  { month: "Apr", revenue: 300 },
  { month: "May", revenue: 360 }
];

function mount(): HTMLDivElement {
  const container = document.createElement("div");
  document.body.appendChild(container);
  return container;
}

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("Chart.update", () => {
  it("updates a chart before it is rendered", () => {
    const chart = createChart({ type: "bar", data: first, x: "month", y: "revenue" });
    chart.update({ type: "line", data: second, x: "month", y: "revenue", title: "Updated" });
    expect(chart.config.type).toBe("line");
    expect(chart.config.title).toBe("Updated");
    expect(chart.data.rows).toHaveLength(3);
  });

  it("redraws a rendered chart in the same container", () => {
    const container = mount();
    const chart = createChart({
      type: "bar",
      data: first,
      x: "month",
      y: "revenue",
      className: "custom-chart"
    });
    chart.render(container);
    expect(container.querySelectorAll('[data-numviz-part="bar"]')).toHaveLength(2);
    expect(container.querySelector(".custom-chart")).not.toBeNull();

    chart.update({
      type: "bar",
      data: second,
      x: "month",
      y: "revenue",
      title: "Updated",
      className: "updated-chart"
    });
    expect(container.querySelectorAll('[data-numviz-part="bar"]')).toHaveLength(3);
    expect(container.querySelector(".updated-chart")).not.toBeNull();
    expect(container.querySelector(".custom-chart")).toBeNull();
    expect(container.querySelector('[data-numviz-part="title"]')?.textContent).toBe("Updated");
  });

  it("keeps the previous chart when an update is invalid", () => {
    const container = mount();
    const chart = createChart({ type: "bar", data: first, x: "month", y: "revenue" });
    chart.render(container);
    expect(() =>
      chart.update({ type: "bar", data: first, x: "missing", y: "revenue" })
    ).toThrowError(NumvizError);
    expect(chart.config.x).toBe("month");
    expect(container.querySelectorAll('[data-numviz-part="bar"]')).toHaveLength(2);
  });

  it("rejects updates after destroy", () => {
    const chart = createChart({ type: "bar", data: first, x: "month", y: "revenue" });
    chart.destroy();
    expect(() =>
      chart.update({ type: "bar", data: second, x: "month", y: "revenue" })
    ).toThrowError(/destroyed/i);
  });
});
