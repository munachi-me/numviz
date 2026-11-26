import { createElement, createRef, act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Metric, type MetricHandle } from "../src/react/index.js";

const data = [
  { region: "North", revenue: 100 },
  { region: "South", revenue: 200 },
  { region: "West", revenue: 300 }
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

describe("React Metric", () => {
  it("renders only a host element during server rendering", () => {
    const html = renderToStaticMarkup(
      createElement(Metric, { name: "Revenue", data, column: "revenue" })
    );
    expect(html).toContain('data-numviz-react="metric"');
    expect(html).toContain("numviz-react-metric");
    expect(html).not.toContain("$600.00");
  });

  it("renders a KPI card after mounting", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    const ref = createRef<MetricHandle>();
    await act(async () => {
      root.render(
        createElement(Metric, {
          ref,
          name: "Revenue",
          data,
          column: "revenue",
          format: "currency",
          description: "This month",
          icon: "★",
          comparison: { value: 500 }
        })
      );
    });
    expect(host.querySelector(".numviz-metric")).not.toBeNull();
    expect(host.querySelector(".numviz-metric__value")?.textContent).toBe("$600.00");
    expect(host.querySelector(".numviz-metric__description")?.textContent).toBe("This month");
    expect(host.querySelector(".numviz-metric__icon")?.textContent).toBe("★");
    expect(host.querySelector(".numviz-metric__change")?.textContent).toBe("+20%");
    expect(ref.current?.getMetric()?.result.value).toBe(600);
    await act(async () => root.unmount());
  });

  it("recomputes when props change", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    await act(async () => {
      root.render(createElement(Metric, { name: "Revenue", data, column: "revenue" }));
    });
    expect(host.querySelector(".numviz-metric__value")?.textContent).toBe("600");

    await act(async () => {
      root.render(
        createElement(Metric, {
          name: "Revenue",
          data: data.slice(0, 2),
          column: "revenue",
          variant: "compact"
        })
      );
    });
    expect(host.querySelector(".numviz-metric__value")?.textContent).toBe("300");
    expect(host.querySelector(".numviz-metric--compact")).not.toBeNull();
    await act(async () => root.unmount());
  });

  it("reflects loading and error props", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    await act(async () => {
      root.render(createElement(Metric, { name: "Revenue", data, column: "revenue", loading: true }));
    });
    expect(host.querySelector(".numviz-metric--loading")).not.toBeNull();
    expect(host.querySelector(".numviz-metric__value")?.textContent).toBe("Loading…");

    await act(async () => {
      root.render(
        createElement(Metric, {
          name: "Revenue",
          data,
          column: "revenue",
          error: "Request failed"
        })
      );
    });
    expect(host.querySelector('[role="alert"]')?.textContent).toBe("Request failed");
    await act(async () => root.unmount());
  });

  it("applies inline host styles", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    await act(async () => {
      root.render(
        createElement(Metric, {
          name: "Revenue",
          data,
          column: "revenue",
          style: { maxWidth: "240px" }
        })
      );
    });
    expect((host.firstElementChild as HTMLElement).style.maxWidth).toBe("240px");
    await act(async () => root.unmount());
  });
});
