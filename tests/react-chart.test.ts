import { act, createElement, createRef } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Chart, type ChartHandle } from "../src/react/index.js";

const data = [
  { month: "Jan", revenue: 120 },
  { month: "Feb", revenue: 180 }
];

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

beforeEach(() => {
  document.body.innerHTML = "";
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  document.body.innerHTML = "";
  globalThis.IS_REACT_ACT_ENVIRONMENT = undefined;
});

describe("React Chart", () => {
  it("renders only a host element during server rendering", () => {
    const html = renderToStaticMarkup(
      createElement(Chart, { type: "bar", data, x: "month", y: "revenue" })
    );
    expect(html).toContain('data-numviz-react="chart"');
    expect(html).toContain("numviz-react-chart");
    expect(html).not.toContain("<svg");
  });

  it("mounts a chart and updates it when data changes", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    const ref = createRef<ChartHandle>();
    await act(async () => {
      root.render(
        createElement(Chart, {
          ref,
          type: "bar",
          data,
          x: "month",
          y: "revenue",
          title: "Revenue"
        })
      );
    });
    expect(host.querySelector("svg")).not.toBeNull();
    expect(host.querySelectorAll('[data-numviz-part="bar"]')).toHaveLength(2);
    const chart = ref.current?.getChart();
    expect(chart?.config.title).toBe("Revenue");

    const update = vi.spyOn(chart!, "update");
    await act(async () => {
      root.render(
        createElement(Chart, {
          ref,
          type: "bar",
          data: [...data],
          x: "month",
          y: "revenue",
          title: "Revenue"
        })
      );
    });
    expect(update).not.toHaveBeenCalled();

    await act(async () => {
      root.render(
        createElement(Chart, {
          ref,
          type: "line",
          data: [...data, { month: "Mar", revenue: 240 }],
          x: "month",
          y: "revenue",
          title: "Updated"
        })
      );
    });
    expect(update).toHaveBeenCalledTimes(1);
    expect(ref.current?.getChart()).toBe(chart);
    expect(host.querySelectorAll('[data-numviz-part="line"]')).toHaveLength(1);
    expect(host.querySelector('[data-numviz-part="title"]')?.textContent).toBe("Updated");
    await act(async () => root.unmount());
  });

  it("applies host styles and destroys the chart on unmount", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    const ref = createRef<ChartHandle>();
    await act(async () => {
      root.render(
        createElement(Chart, {
          ref,
          type: "bar",
          data,
          x: "month",
          y: "revenue",
          style: { maxWidth: "480px" }
        })
      );
    });
    expect((host.firstElementChild as HTMLElement).style.maxWidth).toBe("480px");
    const chart = ref.current?.getChart();
    expect(chart?.element).not.toBeNull();

    await act(async () => root.unmount());
    expect(chart?.isDestroyed).toBe(true);
    expect(chart?.element).toBeNull();
    expect(ref.current).toBeNull();
  });
});
