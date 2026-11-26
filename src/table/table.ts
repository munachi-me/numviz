import { NumvizError } from "../errors.js";
import { resolveTheme } from "../theme/tokens.js";
import type { ThemeTokens } from "../types.js";
import {
  applyThemeTokens,
  ensureStyles,
  getDocument,
  getWindow,
  resolveContainer
} from "../utils/dom.js";
import { requireNonEmptyString } from "../utils/validate.js";
import { formatCellValue } from "./format.js";
import { resolveTable } from "./resolve.js";
import { TABLE_CSS, TABLE_STYLE_ID } from "./styles.js";
import type {
  ResolvedTableColumn,
  ResolvedTableConfig,
  Table,
  TableConfig,
  TableData,
  TableRow,
  TableSortDirection,
  TableSortState,
  TableState
} from "./types.js";

type TableWindow = Window & typeof globalThis;

interface SortableRow {
  readonly index: number;
  readonly row: TableRow;
}

interface HeaderCells {
  readonly cells: Map<string, HTMLTableCellElement>;
  readonly indicators: Map<string, HTMLElement>;
  readonly selectAll: HTMLInputElement | null;
}

class NumvizTable implements Table {
  #config: ResolvedTableConfig;
  #rows: readonly TableRow[];
  #input: TableConfig;

  #root: HTMLElement | null = null;
  #container: Element | null = null;
  #view: TableWindow | undefined;
  #destroyed = false;
  #cleanups: Array<() => void> = [];

  #sort: TableSortState | null = null;
  #page = 1;
  #query = "";
  #selected = new Set<number>();
  #loading = false;
  #error: string | null = null;

  #table: HTMLTableElement | null = null;
  #tbody: HTMLTableSectionElement | null = null;
  #toolbar: HTMLElement | null = null;
  #searchInput: HTMLInputElement | null = null;
  #footer: HTMLElement | null = null;
  #status: HTMLElement | null = null;
  #pageStatus: HTMLElement | null = null;
  #prevButton: HTMLButtonElement | null = null;
  #nextButton: HTMLButtonElement | null = null;
  #pageSizeSelect: HTMLSelectElement | null = null;
  #header: HeaderCells = { cells: new Map(), indicators: new Map(), selectAll: null };

  constructor(config: TableConfig) {
    const resolved = resolveTable(config);
    this.#input = config;
    this.#config = resolved.config;
    this.#rows = resolved.data.rows;
    this.#sort = resolved.config.defaultSort;
    this.#selected = new Set(resolved.config.selectedRows);
    this.#loading = resolved.config.loading;
    this.#error = resolved.config.error;
    this.#query = "";
  }

  get config(): ResolvedTableConfig {
    return this.#config;
  }

  get data(): TableData {
    return { rows: this.#rows, rowCount: this.#rows.length };
  }

  get element(): HTMLElement | null {
    return this.#root;
  }

  get isDestroyed(): boolean {
    return this.#destroyed;
  }

  render(target: string | Element): Table {
    if (this.#destroyed) {
      throw new NumvizError("This table has been destroyed. Create a new table to render again.", {
        code: "DESTROYED"
      });
    }
    const container =
      typeof target === "string"
        ? resolveContainer(target, getDocument())
        : resolveContainer(target);
    const doc = container.ownerDocument ?? getDocument();
    ensureStyles(doc, TABLE_STYLE_ID, TABLE_CSS);
    this.#clearRendered();
    this.#container = container;
    this.#view = getWindow(doc);
    this.#build();
    return this;
  }

  update(config: TableConfig): Table {
    const resolved = resolveTable(config);
    const previousSort = this.#sort;
    const previousPage = this.#page;
    const previousQuery = this.#query;
    const previousSelected = this.#selected;

    this.#input = config;
    this.#config = resolved.config;
    this.#rows = resolved.data.rows;
    this.#sort =
      previousSort && resolved.config.columns.some((column) => column.field === previousSort.field)
        ? previousSort
        : resolved.config.defaultSort;
    this.#selected = new Set(
      [...previousSelected].filter((index) => index >= 0 && index < this.#rows.length)
    );
    this.#query = previousQuery;
    this.#page = previousPage;
    this.#loading = resolved.config.loading;
    this.#error = resolved.config.error;
    if (this.#root) {
      const active = this.#root.ownerDocument.activeElement;
      const searchFocused = this.#searchInput !== null && active === this.#searchInput;
      this.#build();
      if (searchFocused && this.#searchInput) {
        this.#searchInput.focus();
        const length = this.#searchInput.value.length;
        try {
          this.#searchInput.setSelectionRange(length, length);
        } catch {
          // Some input types do not expose a selection range.
        }
      }
    }
    return this;
  }

  setData(data: TableConfig["data"], columns?: TableConfig["columns"]): Table {
    return this.update({
      ...this.#input,
      data,
      ...(columns !== undefined ? { columns } : {})
    });
  }

  setLoading(loading: boolean): Table {
    if (typeof loading !== "boolean") {
      throw new NumvizError("`loading` must be a boolean.", {
        code: "INVALID_CONFIG",
        path: "loading"
      });
    }
    this.#loading = loading;
    this.#refresh();
    return this;
  }

  setError(message: string | null): Table {
    if (message !== null) requireNonEmptyString(message, "error");
    this.#error = message;
    this.#refresh();
    return this;
  }

  setSort(field: string | null, direction: TableSortDirection = "asc", emit = true): Table {
    if (field === null) {
      this.#sort = null;
    } else {
      const column = this.#config.columns.find((entry) => entry.field === field);
      if (!column) {
        throw new NumvizError(`Unknown sort field "${field}".`, {
          code: "INVALID_CONFIG",
          path: "field",
          details: { field }
        });
      }
      if (!column.sortable) {
        throw new NumvizError(`Column "${field}" is not sortable.`, {
          code: "INVALID_CONFIG",
          path: "field",
          details: { field }
        });
      }
      if (direction !== "asc" && direction !== "desc") {
        throw new NumvizError('`direction` must be "asc" or "desc".', {
          code: "INVALID_CONFIG",
          path: "direction",
          details: { received: direction }
        });
      }
      this.#sort = { field, direction };
    }
    this.#refresh();
    if (emit) this.#config.onSortChange?.(this.#sort);
    return this;
  }

  setPage(page: number, emit = true): Table {
    if (!Number.isInteger(page) || page < 1) {
      throw new NumvizError("`page` must be a positive integer.", {
        code: "INVALID_CONFIG",
        path: "page",
        details: { received: page }
      });
    }
    const clamped = Math.min(page, this.getState().pageCount);
    const changed = clamped !== this.#page;
    this.#page = clamped;
    this.#refresh();
    if (emit && changed) this.#config.onPageChange?.(this.#page);
    return this;
  }

  setSearch(query: string, emit = true): Table {
    if (typeof query !== "string") {
      throw new NumvizError("`query` must be a string.", {
        code: "INVALID_CONFIG",
        path: "query"
      });
    }
    this.#query = query;
    this.#page = 1;
    if (this.#searchInput && this.#searchInput.value !== query) this.#searchInput.value = query;
    this.#refresh();
    if (emit) this.#config.onSearchChange?.(query);
    return this;
  }

  setSelection(indices: readonly number[], emit = true): Table {
    if (!Array.isArray(indices)) {
      throw new NumvizError("`indices` must be an array of row indices.", {
        code: "INVALID_CONFIG",
        path: "selection"
      });
    }
    const next = new Set<number>();
    indices.forEach((value, index) => {
      if (!Number.isInteger(value) || value < 0 || value >= this.#rows.length) {
        throw new NumvizError("Selected rows must be valid non-negative integers.", {
          code: "INVALID_CONFIG",
          path: `selection[${index}]`,
          details: { received: value, rowCount: this.#rows.length }
        });
      }
      next.add(value);
    });
    this.#selected = next;
    this.#refresh();
    if (emit) this.#emitSelection();
    return this;
  }

  getSelectedRows(): TableRow[] {
    return [...this.#selected]
      .sort((a, b) => a - b)
      .map((index) => this.#rows[index])
      .filter((row): row is TableRow => row !== undefined);
  }

  getState(): TableState {
    const filteredRowCount = this.#filteredRows().length;
    const pageCount = Math.max(1, Math.ceil(filteredRowCount / this.#config.pageSize));
    return {
      sort: this.#sort,
      page: Math.min(this.#page, pageCount),
      pageCount,
      search: this.#query,
      selectedRows: [...this.#selected].sort((a, b) => a - b),
      filteredRowCount,
      totalRowCount: this.#rows.length
    };
  }

  destroy(): void {
    this.#clearRendered();
    this.#destroyed = true;
  }

  #clearRendered(): void {
    for (const cleanup of this.#cleanups) cleanup();
    this.#cleanups = [];
    this.#root?.remove();
    this.#root = null;
    this.#table = null;
    this.#tbody = null;
    this.#toolbar = null;
    this.#searchInput = null;
    this.#footer = null;
    this.#status = null;
    this.#pageStatus = null;
    this.#prevButton = null;
    this.#nextButton = null;
    this.#pageSizeSelect = null;
    this.#header = { cells: new Map(), indicators: new Map(), selectAll: null };
    this.#container = null;
    this.#view = undefined;
  }

  #tokens(): ThemeTokens {
    return resolveTheme(this.#config.theme, this.#view);
  }

  #on<K extends keyof HTMLElementEventMap>(
    element: HTMLElement,
    type: K,
    listener: (event: HTMLElementEventMap[K]) => void
  ): void {
    element.addEventListener(type, listener);
    this.#cleanups.push(() => element.removeEventListener(type, listener));
  }

  #visibleColumns(): ResolvedTableColumn[] {
    return this.#config.columns.filter((column) => column.visible);
  }

  #columnCount(): number {
    return (
      this.#visibleColumns().length +
      (this.#config.selectable ? 1 : 0) +
      (this.#config.rowNumbers ? 1 : 0)
    );
  }

  #cellValue(row: TableRow, column: ResolvedTableColumn): unknown {
    return column.value ? column.value(row) : row[column.field];
  }

  #build(): void {
    for (const cleanup of this.#cleanups) cleanup();
    this.#cleanups = [];
    this.#root?.remove();
    this.#root = null;
    this.#table = null;
    this.#tbody = null;
    this.#toolbar = null;
    this.#searchInput = null;
    this.#footer = null;
    this.#status = null;
    this.#pageStatus = null;
    this.#prevButton = null;
    this.#nextButton = null;
    this.#pageSizeSelect = null;
    this.#header = { cells: new Map(), indicators: new Map(), selectAll: null };

    const container = this.#container;
    if (!container) return;
    const doc = container.ownerDocument ?? getDocument();
    this.#view = getWindow(doc);
    const config = this.#config;
    const root = doc.createElement("div");
    const classes = ["numviz-root", "numviz-table", `numviz-table--${config.variant}`];
    if (config.striped) classes.push("numviz-table--striped");
    if (config.stickyHeader) classes.push("numviz-table--sticky-header");
    if (config.className) classes.push(config.className);
    root.className = classes.join(" ");
    root.dataset.numvizRoot = "table";
    root.dataset.numvizType = "table";
    root.dataset.numvizVariant = config.variant;
    applyThemeTokens(root, this.#tokens());
    container.appendChild(root);
    this.#root = root;

    const generatedId = `numviz-table-${(tableSequence += 1)}`;
    const captionText = config.caption ?? config.title ?? config.ariaLabel ?? "Data table";

    if (config.title) {
      const heading = doc.createElement("h3");
      heading.className = "numviz-table__title";
      heading.id = `${generatedId}-title`;
      heading.textContent = config.title;
      root.appendChild(heading);
    }

    if (config.searchable) {
      this.#toolbar = this.#buildToolbar(doc, generatedId);
      root.appendChild(this.#toolbar);
    }

    const viewport = doc.createElement("div");
    viewport.className = "numviz-table__viewport";
    if (config.maxHeight) viewport.style.maxHeight = config.maxHeight;

    const table = doc.createElement("table");
    table.className = "numviz-table__table";
    if (config.ariaLabel) table.setAttribute("aria-label", config.ariaLabel);
    if (config.title && !config.ariaLabel) {
      table.setAttribute("aria-labelledby", `${generatedId}-title`);
    }
    const caption = doc.createElement("caption");
    caption.className = "numviz-sr-only";
    caption.textContent = captionText;
    table.appendChild(caption);

    const thead = doc.createElement("thead");
    this.#header = this.#buildHeader(doc);
    thead.appendChild(this.#headerRow);
    table.appendChild(thead);
    const tbody = doc.createElement("tbody");
    this.#on(tbody, "click", (event) => {
      if (!this.#config.selectable) return;
      const target = event.target as Element | null;
      if (target?.closest("input, button, a, select, textarea, label")) return;
      const row = target?.closest("tr[data-index]");
      if (!row) return;
      const index = Number(row.getAttribute("data-index"));
      this.#toggleRow(index, !this.#selected.has(index));
    });
    this.#on(tbody, "change", (event) => {
      const input = event.target as HTMLInputElement | null;
      if (!input || !input.matches('input[type="checkbox"][data-row-index]')) return;
      this.#toggleRow(Number(input.dataset.rowIndex), input.checked);
    });
    table.appendChild(tbody);
    viewport.appendChild(table);
    root.appendChild(viewport);

    this.#table = table;
    this.#tbody = tbody;

    if (this.#config.pagination || this.#config.searchable || this.#config.selectable) {
      this.#footer = this.#buildFooter(doc);
      root.appendChild(this.#footer);
    }

    this.#refresh();
  }

  #headerRow!: HTMLTableRowElement;

  #buildToolbar(doc: Document, id: string): HTMLElement {
    const toolbar = doc.createElement("div");
    toolbar.className = "numviz-table__toolbar";
    const group = doc.createElement("div");
    group.className = "numviz-table__toolbar-group numviz-table__search";
    const label = doc.createElement("label");
    label.className = "numviz-sr-only";
    label.htmlFor = `${id}-search`;
    label.textContent = "Search table";
    const input = doc.createElement("input");
    input.type = "search";
    input.id = `${id}-search`;
    input.className = "numviz-table__search-input";
    input.placeholder = this.#config.searchPlaceholder;
    input.value = this.#query;
    input.setAttribute("autocomplete", "off");
    this.#on(input, "input", () => {
      this.setSearch(input.value);
    });
    group.append(label, input);
    toolbar.appendChild(group);
    this.#searchInput = input;
    return toolbar;
  }

  #buildHeader(doc: Document): HeaderCells {
    const row = doc.createElement("tr");
    this.#headerRow = row;
    const cells = new Map<string, HTMLTableCellElement>();
    const indicators = new Map<string, HTMLElement>();
    let selectAll: HTMLInputElement | null = null;

    if (this.#config.selectable) {
      const th = doc.createElement("th");
      th.scope = "col";
      th.className = "numviz-table__selection";
      const checkbox = doc.createElement("input");
      checkbox.type = "checkbox";
      checkbox.setAttribute("aria-label", "Select all rows on this page");
      this.#on(checkbox, "change", () => {
        const indices = this.#pageRows().map((entry) => entry.index);
        if (checkbox.checked) indices.forEach((index) => this.#selected.add(index));
        else indices.forEach((index) => this.#selected.delete(index));
        this.#refresh();
        this.#emitSelection();
      });
      th.appendChild(checkbox);
      row.appendChild(th);
      selectAll = checkbox;
    }

    if (this.#config.rowNumbers) {
      const th = doc.createElement("th");
      th.scope = "col";
      th.className = "numviz-table__row-number";
      th.textContent = "#";
      row.appendChild(th);
    }

    for (const column of this.#visibleColumns()) {
      const th = doc.createElement("th");
      th.scope = "col";
      th.setAttribute("aria-sort", "none");
      th.dataset.field = column.field;
      if (column.headerClassName) th.className = column.headerClassName;
      th.style.textAlign = column.align;
      if (column.width) th.style.width = column.width;

      if (column.sortable && this.#config.sortable) {
        const button = doc.createElement("button");
        button.type = "button";
        button.className = "numviz-table__sort";
        button.dataset.field = column.field;
        button.setAttribute("aria-label", `Sort by ${column.label}`);
        const text = doc.createElement("span");
        text.textContent = column.label;
        const indicator = doc.createElement("span");
        indicator.className = "numviz-table__sort-indicator";
        indicator.setAttribute("aria-hidden", "true");
        indicator.textContent = "↕";
        button.append(text, indicator);
        this.#on(button, "click", () => this.#handleSort(column));
        th.appendChild(button);
        indicators.set(column.field, indicator);
      } else {
        th.textContent = column.label;
      }

      cells.set(column.field, th);
      row.appendChild(th);
    }

    return { cells, indicators, selectAll };
  }

  #buildFooter(doc: Document): HTMLElement {
    const footer = doc.createElement("div");
    footer.className = "numviz-table__footer";

    if (this.#config.pagination) {
      const pagination = doc.createElement("div");
      pagination.className = "numviz-table__pagination";

      const pageSizeLabel = doc.createElement("label");
      pageSizeLabel.className = "numviz-table__footer-label";
      const pageSizeText = doc.createElement("span");
      pageSizeText.textContent = "Rows per page";
      const select = doc.createElement("select");
      select.className = "numviz-table__control";
      select.setAttribute("aria-label", "Rows per page");
      for (const size of this.#config.pageSizeOptions) {
        const option = doc.createElement("option");
        option.value = String(size);
        option.textContent = String(size);
        select.appendChild(option);
      }
      select.value = String(this.#config.pageSize);
      this.#on(select, "change", () => {
        const size = Number(select.value);
        this.#input = { ...this.#input, pageSize: size };
        const resolved = resolveTable(this.#input);
        this.#config = resolved.config;
        this.#rows = resolved.data.rows;
        this.#page = 1;
        this.#refresh();
      });
      pageSizeLabel.append(pageSizeText, select);

      const prev = doc.createElement("button");
      prev.type = "button";
      prev.className = "numviz-table__control";
      prev.setAttribute("aria-label", "Previous page");
      prev.textContent = "Prev";
      this.#on(prev, "click", () => this.setPage(this.#page - 1));

      const pageStatus = doc.createElement("span");
      pageStatus.className = "numviz-table__page-status";

      const next = doc.createElement("button");
      next.type = "button";
      next.className = "numviz-table__control";
      next.setAttribute("aria-label", "Next page");
      next.textContent = "Next";
      this.#on(next, "click", () => this.setPage(this.#page + 1));

      pagination.append(pageSizeLabel, prev, pageStatus, next);
      footer.appendChild(pagination);
      this.#pageSizeSelect = select;
      this.#prevButton = prev;
      this.#nextButton = next;
      this.#pageStatus = pageStatus;
    }

    const status = doc.createElement("div");
    status.className = "numviz-table__status";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    footer.appendChild(status);
    this.#status = status;

    return footer;
  }

  #refresh(): void {
    const tbody = this.#tbody;
    if (!tbody || !this.#root) return;
    const sorted = this.#sortedRows();
    const pageCount = Math.max(1, Math.ceil(sorted.length / this.#config.pageSize));
    this.#page = Math.min(Math.max(1, this.#page), pageCount);
    const pageRows = this.#pageRows();
    this.#renderBody(pageRows, sorted.length, pageCount);
    this.#updateHeader(pageRows);
    this.#updateFooter(sorted.length, pageRows, pageCount);
    this.#table?.setAttribute("aria-busy", this.#loading ? "true" : "false");
  }

  #handleSort(column: ResolvedTableColumn): void {
    if (!column.sortable || !this.#config.sortable) return;
    if (this.#sort?.field === column.field) {
      this.#sort =
        this.#sort.direction === "asc"
          ? { field: column.field, direction: "desc" }
          : null;
    } else {
      this.#sort = { field: column.field, direction: "asc" };
    }
    this.#refresh();
    this.#config.onSortChange?.(this.#sort);
  }

  #pageRows(): SortableRow[] {
    const sorted = this.#sortedRows();
    const pageCount = Math.max(1, Math.ceil(sorted.length / this.#config.pageSize));
    const page = Math.min(Math.max(1, this.#page), pageCount);
    const start = (page - 1) * this.#config.pageSize;
    return sorted.slice(start, start + this.#config.pageSize);
  }

  #filteredRows(): SortableRow[] {
    const base = this.#rows.map((row, index) => ({ row, index }));
    const query = this.#query.trim().toLowerCase();
    if (!query) return base;
    const columns = this.#visibleColumns().filter((column) => column.searchable);
    if (columns.length === 0) return base;
    return base.filter(({ row }) =>
      columns.some((column) => {
        const value = this.#cellValue(row, column);
        const formatted = formatCellValue(value, row, column, this.#config.locale);
        return (
          formatted.toLowerCase().includes(query) ||
          String(value ?? "").toLowerCase().includes(query)
        );
      })
    );
  }

  #sortedRows(): SortableRow[] {
    const rows = this.#filteredRows();
    const sort = this.#sort;
    if (!sort) return rows;
    const column = this.#config.columns.find((entry) => entry.field === sort.field);
    if (!column) return rows;
    const direction = sort.direction === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = this.#cellValue(a.row, column);
      const bv = this.#cellValue(b.row, column);
      const aMissing = av === null || av === undefined || av === "";
      const bMissing = bv === null || bv === undefined || bv === "";
      if (aMissing && bMissing) return a.index - b.index;
      if (aMissing) return 1;
      if (bMissing) return -1;
      const comparison = this.#compare(av, bv);
      return comparison === 0 ? a.index - b.index : comparison * direction;
    });
  }

  #compare(a: unknown, b: unknown): number {
    if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
    if (typeof a === "number" && typeof b === "number") return a - b;
    if (typeof a === "boolean" && typeof b === "boolean") return Number(a) - Number(b);
    return String(a).localeCompare(String(b), this.#config.locale, {
      numeric: true,
      sensitivity: "base"
    });
  }

  #renderBody(pageRows: readonly SortableRow[], filteredCount: number, pageCount: number): void {
    const tbody = this.#tbody;
    if (!tbody) return;
    const doc = tbody.ownerDocument;
    tbody.replaceChildren();
    const colSpan = Math.max(1, this.#columnCount());

    if (this.#loading) {
      tbody.appendChild(this.#stateRow(doc, colSpan, "numviz-table__loading", this.#config.loadingMessage, "status"));
      return;
    }
    if (this.#error) {
      tbody.appendChild(this.#stateRow(doc, colSpan, "numviz-table__error", this.#error, "alert"));
      return;
    }
    if (this.#rows.length === 0) {
      tbody.appendChild(this.#stateRow(doc, colSpan, "numviz-table__empty", this.#config.emptyMessage));
      return;
    }
    if (filteredCount === 0) {
      tbody.appendChild(
        this.#stateRow(doc, colSpan, "numviz-table__empty", this.#config.noResultsMessage)
      );
      return;
    }

    const pageStart = (this.#page - 1) * this.#config.pageSize;
    pageRows.forEach((entry, position) => {
      const { row, index } = entry;
      const tr = doc.createElement("tr");
      tr.dataset.index = String(index);
      tr.className = "numviz-table__row";
      if (this.#config.selectable) {
        tr.setAttribute("aria-selected", this.#selected.has(index) ? "true" : "false");
      }
      if (this.#selected.has(index)) tr.classList.add("numviz-table__row--selected");

      if (this.#config.selectable) {
        const td = doc.createElement("td");
        td.className = "numviz-table__selection";
        const checkbox = doc.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = this.#selected.has(index);
        checkbox.dataset.rowIndex = String(index);
        checkbox.setAttribute("aria-label", `Select row ${index + 1}`);
        td.appendChild(checkbox);
        tr.appendChild(td);
      }
      if (this.#config.rowNumbers) {
        const td = doc.createElement("td");
        td.className = "numviz-table__row-number";
        td.textContent = String(pageStart + position + 1);
        tr.appendChild(td);
      }
      for (const column of this.#visibleColumns()) {
        const td = doc.createElement("td");
        if (column.className) td.className = column.className;
        td.style.textAlign = column.align;
        if (column.render) {
          const rendered = column.render(row, { rowIndex: index, row, column });
          if (rendered instanceof Node) td.appendChild(rendered);
          else if (rendered !== null && rendered !== undefined) {
            td.textContent = String(rendered);
          }
        } else {
          td.textContent = formatCellValue(
            this.#cellValue(row, column),
            row,
            column,
            this.#config.locale
          );
        }
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    });
    void pageCount;
  }

  #stateRow(
    doc: Document,
    colSpan: number,
    className: string,
    message: string,
    role?: "status" | "alert"
  ): HTMLTableRowElement {
    const tr = doc.createElement("tr");
    const td = doc.createElement("td");
    td.colSpan = colSpan;
    td.className = "numviz-table__cell--state";
    const div = doc.createElement("div");
    div.className = className;
    div.textContent = message;
    if (role) div.setAttribute("role", role);
    td.appendChild(div);
    tr.appendChild(td);
    return tr;
  }

  #updateHeader(pageRows: readonly SortableRow[]): void {
    const active = this.#sort;
    for (const [field, cell] of this.#header.cells) {
      cell.setAttribute(
        "aria-sort",
        active?.field === field
          ? active.direction === "asc"
            ? "ascending"
            : "descending"
          : "none"
      );
    }
    for (const [field, indicator] of this.#header.indicators) {
      const isActive = active?.field === field;
      indicator.textContent = isActive ? (active?.direction === "asc" ? "▲" : "▼") : "↕";
      indicator.classList.toggle("numviz-table__sort-indicator--active", isActive);
    }
    const selectAll = this.#header.selectAll;
    if (selectAll) {
      const indices = pageRows.map((entry) => entry.index);
      const selectedCount = indices.filter((index) => this.#selected.has(index)).length;
      selectAll.checked = indices.length > 0 && selectedCount === indices.length;
      selectAll.indeterminate = selectedCount > 0 && selectedCount < indices.length;
      selectAll.disabled = indices.length === 0;
    }
  }

  #updateFooter(
    filteredCount: number,
    pageRows: readonly SortableRow[],
    pageCount: number
  ): void {
    if (this.#pageStatus) this.#pageStatus.textContent = `Page ${this.#page} of ${pageCount}`;
    if (this.#prevButton) this.#prevButton.disabled = this.#page <= 1;
    if (this.#nextButton) this.#nextButton.disabled = this.#page >= pageCount;
    if (this.#pageSizeSelect) this.#pageSizeSelect.value = String(this.#config.pageSize);
    if (this.#status) {
      const total = this.#rows.length;
      let text: string;
      if (total === 0) text = "0 rows";
      else if (filteredCount === 0) text = `0 of ${total} rows`;
      else {
        const from = (this.#page - 1) * this.#config.pageSize + 1;
        const to = from + pageRows.length - 1;
        text = `Showing ${from}–${to} of ${filteredCount} rows`;
        if (filteredCount !== total) text += ` (filtered from ${total})`;
      }
      if (this.#config.selectable && this.#selected.size > 0) {
        text += ` · ${this.#selected.size} selected`;
      }
      this.#status.textContent = text;
    }
  }

  #toggleRow(index: number, selected: boolean): void {
    if (selected) this.#selected.add(index);
    else this.#selected.delete(index);
    this.#refresh();
    this.#emitSelection();
  }

  #emitSelection(): void {
    this.#config.onSelectionChange?.(
      [...this.#selected].sort((a, b) => a - b),
      this.getSelectedRows()
    );
  }
}

let tableSequence = 0;

/** Create a table instance. */
export function createTable(config: TableConfig): Table {
  return new NumvizTable(config);
}
