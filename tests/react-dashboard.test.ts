import { createElement, act, createRef, Fragment } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  Dashboard,
  DataTable,
  Metric,
  type DashboardHandle
} from "../src/react/index.js";
import type { DashboardConfig } from "../src/index.js";

const sales = [
  { region: "North", revenue: 100, month: "Jan" },
  { region: "South", revenue: 200, month: "Jan" }
];

const employees = [
  { name: "Ada", salary: 120000 },
  { name: "Grace", salary: 145000 }
];

function config(title = "Sales"): DashboardConfig {
  return {
    title,
    components: [
      {
        id: "revenue",
        type: "metric",
        name: "Revenue",
        data: sales,
        column: "revenue",
        aggregation: "sum"
      },
      {
        id: "records",
        type: "table",
        data: employees
      }
    ]
  };
}

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

describe("React Dashboard", () => {
  it("renders only a host element during server rendering", () => {
    const html = renderToStaticMarkup(createElement(Dashboard, config()));
    expect(html).toContain('data-numviz-react="dashboard"');
    expect(html).toContain("numviz-react-dashboard");
    expect(html).not.toContain("numviz-dashboard__title");
    expect(html).not.toContain("<table");
  });

  it("mounts a dashboard and reconciles prop updates", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    const ref = createRef<DashboardHandle>();
    await act(async () => {
      root.render(createElement(Dashboard, { ...config(), ref }));
    });
    expect(host.querySelector(".numviz-dashboard__title")?.textContent).toBe("Sales");
    expect(host.querySelector(".numviz-metric__value")?.textContent).toBe("300");
    expect(host.querySelector("table")).not.toBeNull();
    const dashboard = ref.current?.getDashboard();
    expect(dashboard?.widgets).toHaveLength(2);

    await act(async () => {
      root.render(
        createElement(Dashboard, {
          ...config("Updated"),
          components: [
            {
              id: "revenue",
              type: "metric",
              name: "Net revenue",
              data: [...sales, { region: "West", revenue: 300, month: "Feb" }],
              column: "revenue",
              aggregation: "sum"
            },
            {
              id: "records",
              type: "table",
              data: employees
            }
          ],
          ref
        })
      );
    });
    expect(host.querySelector(".numviz-dashboard__title")?.textContent).toBe("Updated");
    expect(host.querySelector(".numviz-metric__title")?.textContent).toBe("Net revenue");
    expect(host.querySelector(".numviz-metric__value")?.textContent).toBe("600");
    expect(dashboard?.widgets).toHaveLength(2);

    await act(async () => root.unmount());
    expect(dashboard?.isDestroyed).toBe(true);
    expect(host.querySelector(".numviz-dashboard")).toBeNull();
  });

  it("renders dashboard filters and updates connected widgets", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    await act(async () => {
      root.render(
        createElement(Dashboard, {
          title: "Filtered",
          filters: [
            { id: "region", type: "select", field: "region", label: "Region" }
          ],
          components: [
            {
              id: "revenue",
              type: "metric",
              name: "Revenue",
              data: sales,
              column: "revenue",
              aggregation: "sum"
            }
          ]
        })
      );
    });
    const select = host.querySelector<HTMLSelectElement>(
      '[data-nv-filter-id="region"] select'
    );
    expect(select).not.toBeNull();
    select!.value = "North";
    await act(async () => {
      select!.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(host.querySelector(".numviz-metric__value")?.textContent).toBe("100");
    await act(async () => root.unmount());
  });

  it("composes individual React components without the Dashboard wrapper", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    await act(async () => {
      root.render(
        createElement(
          Fragment,
          null,
          createElement(Metric, {
            name: "Revenue",
            data: sales,
            column: "revenue",
            aggregation: "sum"
          }),
          createElement(DataTable, { data: employees })
        )
      );
    });
    expect(host.querySelector(".numviz-dashboard")).toBeNull();
    expect(host.querySelector(".numviz-metric__value")?.textContent).toBe("300");
    expect(host.querySelector("table")).not.toBeNull();
    await act(async () => root.unmount());
  });
});
