import { Fragment, act, createElement, createRef } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  Dashboard,
  DashboardWidget,
  type DashboardHandle,
  type DashboardWidgetHandle
} from "../src/react/index.js";

const sales = [
  { region: "North", revenue: 100 },
  { region: "South", revenue: 200 }
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

describe("React DashboardWidget", () => {
  it("renders only a host element during server rendering", () => {
    const html = renderToStaticMarkup(
      createElement(DashboardWidget, {
        id: "revenue",
        type: "metric",
        data: sales,
        column: "revenue",
        aggregation: "sum"
      })
    );
    expect(html).toContain('data-numviz-react="dashboard-widget"');
    expect(html).toContain("numviz-react-dashboard-widget");
    expect(html).not.toContain("numviz-dashboard__widget");
  });

  it("mounts one widget and updates it when props change", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    const ref = createRef<DashboardWidgetHandle>();
    await act(async () => {
      root.render(
        createElement(DashboardWidget, {
          ref,
          id: "revenue",
          type: "metric",
          name: "Revenue",
          data: sales,
          column: "revenue",
          aggregation: "sum",
          containerStyle: { maxWidth: "320px" }
        })
      );
    });
    expect((host.firstElementChild as HTMLElement).style.maxWidth).toBe("320px");
    expect(host.querySelector(".numviz-metric__value")?.textContent).toBe("300");
    expect(ref.current?.getWidget()?.component.id).toBe("revenue");

    await act(async () => {
      root.render(
        createElement(DashboardWidget, {
          ref,
          id: "revenue",
          type: "metric",
          name: "Net revenue",
          data: [...sales, { region: "West", revenue: 300 }],
          column: "revenue",
          aggregation: "sum"
        })
      );
    });
    expect(host.querySelector(".numviz-metric__title")?.textContent).toBe("Net revenue");
    expect(host.querySelector(".numviz-metric__value")?.textContent).toBe("600");
    await act(async () => root.unmount());
  });

  it("accepts a dashboard component object through component or config", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    await act(async () => {
      root.render(
        createElement(DashboardWidget, {
          component: { id: "title", type: "heading", text: "Overview", level: 1 },
          style: { maxWidth: "360px" }
        })
      );
    });
    expect((host.firstElementChild as HTMLElement).style.maxWidth).toBe("360px");
    expect(host.querySelector("h1")?.textContent).toBe("Overview");

    await act(async () => {
      root.render(
        createElement(DashboardWidget, {
          config: { id: "title", type: "heading", text: "Updated overview", level: 2 }
        })
      );
    });
    expect(host.querySelector("h2")?.textContent).toBe("Updated overview");
    await act(async () => root.unmount());
  });

  it("composes DashboardWidget children inside Dashboard", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    const ref = createRef<DashboardHandle>();
    await act(async () => {
      root.render(
        createElement(
          Dashboard,
          { ref, title: "Sales" },
          createElement(DashboardWidget, {
            id: "revenue",
            type: "metric",
            data: sales,
            column: "revenue",
            aggregation: "sum"
          }),
          createElement(
            Fragment,
            null,
            createElement(DashboardWidget, {
              id: "records",
              type: "table",
              data: sales
            })
          )
        )
      );
    });
    expect(ref.current?.getDashboard()?.widgets).toHaveLength(2);
    expect(host.querySelectorAll(".numviz-dashboard__widget")).toHaveLength(2);
    expect(host.querySelectorAll(".numviz-react-dashboard-widget")).toHaveLength(0);
    expect(host.querySelector("table")).not.toBeNull();

    await act(async () => {
      root.render(
        createElement(
          Dashboard,
          {
            ref,
            title: "Sales",
            components: [
              {
                id: "revenue",
                type: "metric",
                name: "Total revenue",
                data: sales,
                column: "revenue",
                aggregation: "sum"
              }
            ]
          },
          createElement(DashboardWidget, {
            id: "records",
            type: "table",
            data: sales
          })
        )
      );
    });
    expect(ref.current?.getDashboard()?.widgets).toHaveLength(2);
    expect(host.querySelector(".numviz-metric__title")?.textContent).toBe("Total revenue");
    await act(async () => root.unmount());
  });
});
