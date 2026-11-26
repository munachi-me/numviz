import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTable, NumvizError, type TableConfig } from "../src/index.js";

const employees = [
  { id: 1, name: "Ada", department: "Engineering", salary: 120000, active: true, joined: "2021-03-01" },
  { id: 2, name: "Grace", department: "Engineering", salary: 145000, active: true, joined: "2019-07-15" },
  { id: 3, name: "Alan", department: "Research", salary: 98000, active: false, joined: "2022-01-10" },
  { id: 4, name: "Katherine", department: "Operations", salary: 110000, active: true, joined: "2020-11-05" },
  { id: 5, name: "Linus", department: "Research", salary: 132000, active: true, joined: "2018-05-21" }
];

const many = Array.from({ length: 25 }, (_, index) => ({
  id: index + 1,
  name: `Person ${index + 1}`,
  score: (index * 7) % 25
}));

function mount(): HTMLDivElement {
  const container = document.createElement("div");
  document.body.appendChild(container);
  return container;
}

function bodyTexts(container: Element): string[] {
  return [...container.querySelectorAll("tbody tr")].map((row) => row.textContent ?? "");
}

function cells(container: Element, rowIndex = 0): string[] {
  const row = container.querySelectorAll("tbody tr")[rowIndex];
  return row ? [...row.querySelectorAll("td")].map((cell) => cell.textContent ?? "") : [];
}

function headerTexts(container: Element): string[] {
  return [...container.querySelectorAll("thead th")].map((cell) =>
    (cell.textContent ?? "").replace(/[↕▲▼]/g, "").trim()
  );
}

function salaryValues(container: Element): number[] {
  return [...container.querySelectorAll("tbody tr")].map((row) =>
    Number((row.querySelectorAll("td")[3]?.textContent ?? "").replace(/[^0-9]/g, ""))
  );
}

function click(element: Element | null): void {
  element?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
}

beforeEach(() => {
  document.body.innerHTML = "";
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("table structure", () => {
  it("renders a semantic HTML table with accessible caption and headers", () => {
    const container = mount();
    createTable({ data: employees, title: "People" }).render(container);
    expect(container.querySelector("table")).not.toBeNull();
    expect(container.querySelector("caption")?.textContent).toBe("People");
    expect(container.querySelectorAll("thead th").length).toBe(6);
    expect(container.querySelectorAll("thead th")[0]?.getAttribute("scope")).toBe("col");
    expect(container.querySelectorAll("tbody tr").length).toBe(5);
    expect(container.querySelectorAll("tbody td").length).toBe(30);
    expect(container.querySelector("table")?.className).toContain("numviz-table__table");
  });

  it("detects columns and formats numbers, dates and booleans", () => {
    const container = mount();
    createTable({ data: employees }).render(container);
    expect(headerTexts(container)).toEqual([
      "id",
      "name",
      "department",
      "salary",
      "active",
      "joined"
    ]);
    const ada = cells(container, 0);
    expect(ada[0]).toBe("1");
    expect(ada[3]).toBe("120,000");
    expect(ada[4]).toBe("true");
    expect(ada[5]).toBe("Mar 1, 2021");
  });

  it("honours column labels, order, visibility, widths and alignment", () => {
    const container = mount();
    createTable({
      data: employees,
      columns: [
        { field: "name", label: "Employee", width: 180 },
        { field: "salary", label: "Pay", align: "center" },
        { field: "department", visible: false },
        "active"
      ]
    }).render(container);
    const headers = [...container.querySelectorAll("thead th")] as HTMLTableCellElement[];
    expect(headerTexts(container)).toEqual(["Employee", "Pay", "active"]);
    expect(headers[0]?.style.width).toBe("180px");
    expect(headers[1]?.style.textAlign).toBe("center");
    const firstRow = container.querySelectorAll("tbody tr")[0];
    const salaryCell = firstRow?.querySelectorAll("td")[1] as HTMLTableCellElement;
    expect(salaryCell.style.textAlign).toBe("center");
    expect(salaryCell.textContent).toBe("120,000");
  });

  it("renders row numbers", () => {
    const container = mount();
    createTable({ data: employees, rowNumbers: true }).render(container);
    expect(container.querySelectorAll("thead th")[0]?.textContent).toBe("#");
    expect(cells(container, 0)[0]).toBe("1");
    expect(cells(container, 4)[0]).toBe("5");
  });
});

describe("sorting", () => {
  it("cycles ascending, descending and unsorted states", () => {
    const container = mount();
    const events: unknown[] = [];
    createTable({
      data: employees,
      onSortChange: (sort) => events.push(sort)
    }).render(container);
    click(container.querySelector('button[data-field="salary"]'));
    expect(salaryValues(container)).toEqual([98000, 110000, 120000, 132000, 145000]);
    expect(container.querySelector('th[data-field="salary"]')?.getAttribute("aria-sort")).toBe(
      "ascending"
    );
    click(container.querySelector('button[data-field="salary"]'));
    expect(salaryValues(container)).toEqual([145000, 132000, 120000, 110000, 98000]);
    expect(container.querySelector('th[data-field="salary"]')?.getAttribute("aria-sort")).toBe(
      "descending"
    );
    click(container.querySelector('button[data-field="salary"]'));
    expect(container.querySelector('th[data-field="salary"]')?.getAttribute("aria-sort")).toBe(
      "none"
    );
    expect(events).toHaveLength(3);
  });

  it("applies defaultSort and sorts dates", () => {
    const container = mount();
    createTable({
      data: employees,
      columns: ["name", "joined"],
      defaultSort: { field: "joined", direction: "asc" }
    }).render(container);
    expect(cells(container, 0)).toEqual(["Linus", "May 21, 2018"]);
    expect(container.querySelector('th[data-field="joined"]')?.getAttribute("aria-sort")).toBe(
      "ascending"
    );
  });
});

describe("search and pagination", () => {
  it("filters rows across searchable columns", () => {
    const container = mount();
    const queries: string[] = [];
    createTable({
      data: employees,
      searchable: true,
      onSearchChange: (query) => queries.push(query)
    }).render(container);
    const input = container.querySelector<HTMLInputElement>('input[type="search"]');
    expect(input).not.toBeNull();
    if (!input) return;
    input.value = "research";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    expect(container.querySelectorAll("tbody tr")).toHaveLength(2);
    expect(bodyTexts(container).every((text) => text.includes("Research"))).toBe(true);
    expect(container.querySelector('[role="status"]')?.textContent).toContain("of 2 rows");
    input.value = "zzz";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    expect(container.querySelector(".numviz-table__empty")?.textContent).toBe("No matching rows");
    expect(queries).toEqual(["research", "zzz"]);
  });

  it("paginates without rendering every row", () => {
    const container = mount();
    const table = createTable({ data: many, pagination: true, pageSize: 10 }).render(container);
    expect(container.querySelectorAll("tbody tr")).toHaveLength(10);
    expect(container.querySelector(".numviz-table__page-status")?.textContent).toBe("Page 1 of 3");
    expect(container.querySelector('[role="status"]')?.textContent).toBe("Showing 1–10 of 25 rows");
    click(container.querySelector('button[aria-label="Next page"]'));
    expect(container.querySelectorAll("tbody tr")).toHaveLength(10);
    expect(container.querySelector(".numviz-table__page-status")?.textContent).toBe("Page 2 of 3");
    click(container.querySelector('button[aria-label="Next page"]'));
    expect(container.querySelectorAll("tbody tr")).toHaveLength(5);
    expect(container.querySelector('button[aria-label="Next page"]')?.hasAttribute("disabled")).toBe(
      true
    );
    table.setPage(1);
    expect(container.querySelector(".numviz-table__page-status")?.textContent).toBe("Page 1 of 3");
  });

  it("renders only one page of a large dataset", () => {
    const container = mount();
    createTable({ data: many, pagination: true, pageSize: 25 }).render(container);
    expect(container.querySelectorAll("tbody tr")).toHaveLength(25);
  });

  it("changes page size through the footer selector", () => {
    const container = mount();
    createTable({ data: many, pagination: true, pageSize: 10 }).render(container);
    const select = container.querySelector<HTMLSelectElement>('select[aria-label="Rows per page"]');
    expect(select).not.toBeNull();
    if (!select) return;
    select.value = "25";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    expect(container.querySelectorAll("tbody tr")).toHaveLength(25);
    expect(container.querySelector(".numviz-table__page-status")?.textContent).toBe("Page 1 of 1");
  });
});

describe("states and derived columns", () => {
  it("shows empty, loading and error states", () => {
    const container = mount();
    const table = createTable({ data: [], emptyMessage: "Nothing here" }).render(container);
    expect(container.querySelector(".numviz-table__empty")?.textContent).toBe("Nothing here");
    table.setLoading(true);
    expect(container.querySelector(".numviz-table__loading")?.textContent).toBe("Loading…");
    expect(container.querySelector("table")?.getAttribute("aria-busy")).toBe("true");
    table.setLoading(false);
    table.setData(employees);
    expect(container.querySelectorAll("tbody tr")).toHaveLength(5);
    table.setError("Request failed");
    expect(container.querySelector('[role="alert"]')?.textContent).toBe("Request failed");
    table.setError(null);
    expect(container.querySelectorAll("tbody tr")).toHaveLength(5);
  });

  it("renders computed and conditional columns without mutating data", () => {
    const container = mount();
    const snapshot = JSON.stringify(employees);
    createTable({
      data: employees,
      columns: [
        { field: "name", label: "Employee" },
        { field: "salary", label: "Salary" },
        { label: "Status", render: (row) => (row.active ? "Active" : "Inactive") },
        {
          field: "bonus",
          label: "Bonus",
          type: "number",
          value: (row) => Number(row.salary) * 0.1,
          format: "currency",
          currency: "USD"
        },
        {
          field: "profile",
          label: "Profile",
          render: (_row, context) => {
            const span = document.createElement("span");
            span.className = "profile";
            span.textContent = `#${context.rowIndex + 1}`;
            return span;
          }
        }
      ]
    }).render(container);
    expect(headerTexts(container)).toEqual(["Employee", "Salary", "Status", "Bonus", "Profile"]);
    const first = cells(container, 0);
    expect(first[2]).toBe("Active");
    expect(first[3]).toBe("$12,000.00");
    expect(first[4]).toBe("#1");
    expect(container.querySelector(".profile")).not.toBeNull();
    expect(JSON.stringify(employees)).toBe(snapshot);
  });

  it("supports custom formatters and escapes text", () => {
    const container = mount();
    createTable({
      data: [{ name: "<img src=x onerror=alert(1)>", score: 0.5 }],
      columns: [
        { field: "name" },
        { field: "score", format: "percent" },
        { field: "score", label: "Custom", format: (value) => `v=${String(value)}` },
        { field: "name", label: "HTML", render: (row) => `<b>${String(row.name)}</b>` }
      ]
    }).render(container);
    expect(container.querySelector("img")).toBeNull();
    expect(cells(container, 0)[1]).toBe("50%");
    expect(cells(container, 0)[2]).toBe("v=0.5");
    expect(cells(container, 0)[3]).toContain("<b>");
    expect(container.querySelector("b")).toBeNull();
  });
});

describe("selection", () => {
  it("selects rows and pages with callbacks", () => {
    const container = mount();
    const selections: number[][] = [];
    const table = createTable({
      data: employees,
      selectable: true,
      onSelectionChange: (indices) => selections.push([...indices])
    }).render(container);
    const firstRowCheckbox = container.querySelector<HTMLInputElement>(
      'tbody input[type="checkbox"]'
    );
    expect(firstRowCheckbox).not.toBeNull();
    if (!firstRowCheckbox) return;
    firstRowCheckbox.checked = true;
    firstRowCheckbox.dispatchEvent(new Event("change", { bubbles: true }));
    expect(container.querySelectorAll("tbody tr")[0]?.getAttribute("aria-selected")).toBe("true");
    expect(table.getSelectedRows()).toHaveLength(1);
    expect(table.getSelectedRows()[0]?.name).toBe("Ada");

    const selectAll = container.querySelector<HTMLInputElement>('thead input[type="checkbox"]');
    if (!selectAll) throw new Error("missing select all");
    selectAll.checked = true;
    selectAll.dispatchEvent(new Event("change", { bubbles: true }));
    expect(table.getSelectedRows()).toHaveLength(5);
    expect(selectAll.indeterminate).toBe(false);
    expect(selections.at(-1)).toEqual([0, 1, 2, 3, 4]);

    click(container.querySelectorAll("tbody tr")[1] ?? null);
    expect(table.getSelectedRows()).toHaveLength(4);
  });

  it("applies initial selectedRows and syncs through setSelection", () => {
    const container = mount();
    const table = createTable({
      data: employees,
      selectable: true,
      selectedRows: [1, 3]
    }).render(container);
    expect(table.getState().selectedRows).toEqual([1, 3]);
    expect(container.querySelector('tbody tr[data-index="1"]')?.getAttribute("aria-selected")).toBe(
      "true"
    );
    table.setSelection([0], false);
    expect(table.getSelectedRows().map((row) => row.name)).toEqual(["Ada"]);
  });
});

describe("themes and lifecycle", () => {
  it("applies variants, custom classes and dark theme tokens", () => {
    const container = mount();
    createTable({
      data: employees,
      variant: "striped",
      className: "my-table",
      theme: { mode: "dark", accent: "#22D3EE" },
      title: "Dark table"
    }).render(container);
    const root = container.querySelector(".numviz-table") as HTMLElement;
    expect(root.className).toContain("numviz-table--striped");
    expect(root.className).toContain("my-table");
    expect(root.style.getPropertyValue("--nv-background")).toBe("#0B1120");
    expect(root.style.getPropertyValue("--nv-accent")).toBe("#22D3EE");
    expect(container.querySelector(".numviz-table__title")?.textContent).toBe("Dark table");
  });

  it("updates data and destroys output", () => {
    const container = mount();
    const table = createTable({ data: employees }).render(container);
    table.setData([{ id: 9, name: "New" }], ["id", "name"]);
    expect(container.querySelectorAll("tbody tr")).toHaveLength(1);
    expect(bodyTexts(container)[0]).toContain("New");
    table.destroy();
    expect(table.isDestroyed).toBe(true);
    expect(container.querySelector("table")).toBeNull();
  });
});

describe("table validation", () => {
  const base: TableConfig = { data: employees };
  const invalid: Array<[string, TableConfig, string]> = [
    ["pageSize", { ...base, pageSize: 0 }, "pageSize"],
    ["pageSizeOptions", { ...base, pageSizeOptions: [] }, "pageSizeOptions"],
    ["variant", { ...base, variant: "fancy" as never }, "variant"],
    ["columns type", { ...base, columns: {} as never }, "columns"],
    ["column field", { ...base, columns: [{ field: "" }] }, "columns[0].field"],
    [
      "column format",
      { ...base, columns: [{ field: "name", format: "money" as never }] },
      "columns[0].format"
    ],
    ["column render", { ...base, columns: [{ field: "name", render: "x" as never }] }, "columns[0].render"],
    ["defaultSort field", { ...base, defaultSort: { field: "missing" } }, "defaultSort.field"],
    ["selectedRows", { ...base, selectedRows: [99] }, "selectedRows[0]"],
    ["loading", { ...base, loading: "yes" as never }, "loading"],
    ["theme", { ...base, theme: { accent: "" } }, "theme.accent"]
  ];

  for (const [name, config, path] of invalid) {
    it(`rejects invalid ${name}`, () => {
      let caught: unknown;
      try {
        createTable(config);
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(NumvizError);
      expect((caught as NumvizError).code).toBe("INVALID_CONFIG");
      expect((caught as NumvizError).path).toBe(path);
    });
  }

  it("renders tables inside iframes with styles in the frame document", () => {
    const frame = document.createElement("iframe");
    document.body.appendChild(frame);
    const frameDoc = frame.contentDocument;
    if (!frameDoc) throw new Error("missing iframe document");
    const container = frameDoc.createElement("div");
    frameDoc.body.appendChild(container);
    const parentStyleBefore = document.getElementById("numviz-table-styles");
    createTable({ data: employees, theme: { mode: "dark" } }).render(container);
    expect(container.querySelector("table")).not.toBeNull();
    expect(frameDoc.getElementById("numviz-table-styles")).not.toBeNull();
    expect(document.getElementById("numviz-table-styles")).toBe(parentStyleBefore);
    const root = container.querySelector(".numviz-table") as HTMLElement;
    expect(root.style.getPropertyValue("--nv-background")).toBe("#0B1120");
    frame.remove();
  });
});
