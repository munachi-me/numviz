import { createElement, createRef, act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DataTable, type DataTableHandle } from "../src/react/index.js";
import type { TableSortState } from "../src/index.js";

const employees = [
  { id: 1, name: "Ada", department: "Engineering", salary: 120000 },
  { id: 2, name: "Grace", department: "Engineering", salary: 145000 },
  { id: 3, name: "Alan", department: "Research", salary: 98000 }
];

const many = Array.from({ length: 25 }, (_, index) => ({
  id: index + 1,
  name: `Person ${index + 1}`
}));

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

describe("React DataTable", () => {
  it("renders only a host element during server rendering", () => {
    const html = renderToStaticMarkup(createElement(DataTable, { data: employees }));
    expect(html).toContain('data-numviz-react="table"');
    expect(html).toContain("numviz-react-table");
    expect(html).not.toContain("<table");
  });

  it("renders a semantic table after mounting", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    const ref = createRef<DataTableHandle>();
    await act(async () => {
      root.render(createElement(DataTable, { data: employees, ref }));
    });
    expect(host.querySelector("table")).not.toBeNull();
    expect(host.querySelectorAll("tbody tr")).toHaveLength(3);
    expect(ref.current?.getTable()?.getState().totalRowCount).toBe(3);
    await act(async () => root.unmount());
  });

  it("supports controlled sort, page and search", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    const sort: TableSortState = { field: "salary", direction: "desc" };

    await act(async () => {
      root.render(createElement(DataTable, { data: employees, sort }));
    });
    const firstSalary = () =>
      host.querySelectorAll("tbody tr")[0]?.querySelectorAll("td")[3]?.textContent;
    expect(firstSalary()).toBe("145,000");

    await act(async () => {
      root.render(
        createElement(DataTable, { data: employees, sort: { field: "salary", direction: "asc" } })
      );
    });
    expect(firstSalary()).toBe("98,000");

    await act(async () => {
      root.render(createElement(DataTable, { data: many, pagination: true, pageSize: 10, page: 2 }));
    });
    expect(host.querySelector(".numviz-table__page-status")?.textContent).toBe("Page 2 of 3");
    expect(host.querySelectorAll("tbody tr")).toHaveLength(10);

    await act(async () => {
      root.render(createElement(DataTable, { data: employees, searchable: true, search: "research" }));
    });
    expect(host.querySelectorAll("tbody tr")).toHaveLength(1);
    expect(host.querySelector<HTMLInputElement>('input[type="search"]')?.value).toBe("research");
    await act(async () => root.unmount());
  });

  it("reports uncontrolled sorting through callbacks", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    const events: (TableSortState | null)[] = [];
    await act(async () => {
      root.render(
        createElement(DataTable, {
          data: employees,
          onSortChange: (next: TableSortState | null) => events.push(next)
        })
      );
    });
    await act(async () => {
      host
        .querySelector('button[data-field="salary"]')
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(events).toEqual([{ field: "salary", direction: "asc" }]);
    expect(
      host.querySelector('th[data-field="salary"]')?.getAttribute("aria-sort")
    ).toBe("ascending");
    await act(async () => root.unmount());
  });

  it("supports controlled selection and destroys the engine on unmount", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    const ref = createRef<DataTableHandle>();
    await act(async () => {
      root.render(
        createElement(DataTable, { ref, data: employees, selectable: true, selectedRows: [0] })
      );
    });
    const rows = () => host.querySelectorAll("tbody tr");
    expect(rows()[0]?.getAttribute("aria-selected")).toBe("true");

    await act(async () => {
      root.render(
        createElement(DataTable, { ref, data: employees, selectable: true, selectedRows: [1] })
      );
    });
    expect(rows()[1]?.getAttribute("aria-selected")).toBe("true");
    expect(rows()[0]?.getAttribute("aria-selected")).toBe("false");

    const table = ref.current?.getTable();
    await act(async () => root.unmount());
    expect(table?.isDestroyed).toBe(true);
    expect(ref.current).toBeNull();
  });

  it("renders loading and error props", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    await act(async () => {
      root.render(createElement(DataTable, { data: employees, loading: true }));
    });
    expect(host.querySelector(".numviz-table__loading")?.textContent).toBe("Loading…");

    await act(async () => {
      root.render(createElement(DataTable, { data: employees, error: "Failed to load" }));
    });
    expect(host.querySelector('[role="alert"]')?.textContent).toBe("Failed to load");
    await act(async () => root.unmount());
  });
});
