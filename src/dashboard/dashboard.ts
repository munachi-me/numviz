import { createChart } from "../charts/createChart.js";
import { NumvizError } from "../errors.js";
import { createMetric } from "../metric/metric.js";
import type { Metric, MetricConfig } from "../metric/types.js";
import { createTable } from "../table/table.js";
import type { Table, TableConfig } from "../table/types.js";
import { resolveTheme } from "../theme/tokens.js";
import type { Chart, ChartConfig, ThemeConfig } from "../types.js";
import {
  applyThemeTokens,
  ensureBaseStyles,
  getDocument,
  getWindow,
  isDomNode,
  resolveContainer
} from "../utils/dom.js";
import { isPlainObject } from "../utils/validate.js";
import { filterDataInput, collectFilterOptions, isFilterActive } from "./filters.js";
import { resolveDashboard } from "./resolve.js";
import {
  applyWidgetLayout,
  applyWidgetStyle,
  dashboardCss,
  dashboardStyleId
} from "./styles.js";
import type {
  Dashboard,
  DashboardComponent,
  DashboardCrossFilterConfig,
  DashboardCrossFilterState,
  DashboardEventMap,
  DashboardEventType,
  DashboardFilterValue,
  DashboardState,
  DashboardStateUpdate,
  ResolvedDashboardFilter,
  DashboardComponentLayout,
  DashboardConfig,
  DashboardCustomComponent,
  DashboardExportOptions,
  DashboardExportResult,
  DashboardWidget,
  DashboardWidgetStyle,
  ResolvedDashboardConfig,
  ResolvedDashboardFooter,
  ResolvedDashboardHeader
} from "./types.js";
import type {
  ChartClickEvent,
  ColumnInput,
  DataInput,
  NormalizedValue
} from "../types.js";

type DashboardWindow = Window & typeof globalThis;

interface WidgetSlot {
  id: string;
  type: DashboardComponent["type"];
  component: DashboardComponent;
  instance: Chart | Table | Metric | null;
  element: HTMLElement | null;
  body: HTMLElement | null;
  customCleanup: (() => void) | null;
}

let dashboardCounter = 0;

function isContentType(type: DashboardComponent["type"]): boolean {
  return type === "heading" || type === "text" || type === "description" || type === "divider";
}

function widgetLabel(component: DashboardComponent): string {
  if (component.ariaLabel) return component.ariaLabel;
  if (component.title) return component.title;
  if (component.type === "metric") return component.name ?? component.id;
  return component.id;
}

class NumvizDashboard implements Dashboard {
  #source: DashboardConfig;
  #config: ResolvedDashboardConfig;
  #slots: WidgetSlot[] = [];
  #scope: string;

  #root: HTMLElement | null = null;
  #container: Element | null = null;
  #view: DashboardWindow | undefined;
  #header: HTMLElement | null = null;
  #filterBar: HTMLElement | null = null;
  #grid: HTMLElement | null = null;
  #footer: HTMLElement | null = null;
  #style: HTMLStyleElement | null = null;
  #destroyed = false;
  #filterValues = new Map<string, DashboardFilterValue>();
  #crossFilters = new Map<string, ResolvedDashboardFilter>();
  #selections = new Map<string, readonly number[]>();
  #visible = new Map<string, boolean>();
  #listeners = new Map<DashboardEventType, Set<(event: DashboardEventMap[DashboardEventType]) => void>>();

  constructor(config: DashboardConfig) {
    const resolved = resolveDashboard(config);
    this.#source = config;
    this.#config = resolved;
    this.#scope = `numviz-dashboard-${(dashboardCounter += 1)}`;
    this.#syncFilterState(resolved);
    this.#syncVisibility(resolved);
    const slots: WidgetSlot[] = [];
    try {
      for (const component of resolved.components) {
        slots.push(this.#createSlot(component, resolved));
      }
    } catch (error) {
      for (const slot of slots) this.#destroySlot(slot);
      throw error;
    }
    this.#slots = slots;
  }

  get config(): ResolvedDashboardConfig {
    return this.#config;
  }

  get widgets(): readonly DashboardWidget[] {
    return this.#slots.map((slot) => this.#publicWidget(slot));
  }

  get element(): HTMLElement | null {
    return this.#root;
  }

  get isDestroyed(): boolean {
    return this.#destroyed;
  }

  getWidget(id: string): DashboardWidget | null {
    const slot = this.#slots.find((entry) => entry.id === id);
    return slot ? this.#publicWidget(slot) : null;
  }

  getFilter(id: string): DashboardFilterValue {
    return this.#filterValues.get(id) ?? null;
  }

  setFilter(id: string, value: DashboardFilterValue): Dashboard {
    this.#requireFilter(id);
    return this.#setFilterValue(id, value, undefined, false);
  }

  clearFilter(id: string): Dashboard {
    const filter = this.#requireFilter(id);
    if (filter.source !== undefined) {
      this.#crossFilters.delete(id);
      this.#filterValues.delete(id);
      this.#clearSourceSelection(filter.source);
      this.#applyFilteredWidgets();
      this.#syncChrome();
      this.#emit("filterchange", {
        type: "filterchange",
        id,
        value: null,
        filters: this.#filterState(),
        source: filter.source
      });
      this.#emitStateChange();
      return this;
    }
    return this.#setFilterValue(id, null, undefined, false);
  }

  clearFilters(): Dashboard {
    let changed = false;
    for (const filter of this.#config.filters) {
      if (isFilterActive(this.#filterValues.get(filter.id))) {
        this.#filterValues.set(filter.id, null);
        changed = true;
      }
    }
    if (this.#crossFilters.size > 0) {
      for (const filter of this.#crossFilters.values()) {
        this.#filterValues.delete(filter.id);
        if (filter.source) this.#clearSourceSelection(filter.source);
      }
      this.#crossFilters.clear();
      changed = true;
    }
    if (changed) {
      this.#applyFilteredWidgets();
      this.#syncChrome();
      this.#emit("filterchange", {
        type: "filterchange",
        id: "*",
        value: null,
        filters: this.#filterState()
      });
      this.#emitStateChange();
    }
    return this;
  }

  getSelection(id: string): readonly number[] {
    return [...(this.#selections.get(id) ?? [])];
  }

  setSelection(id: string, indices: readonly number[], emit = true): Dashboard {
    const slot = this.#requireWidget(id);
    this.#applySelection(slot, indices);
    if (emit) {
      this.#emit("selectionchange", {
        type: "selectionchange",
        id,
        indices: [...(this.#selections.get(id) ?? [])]
      });
      this.#emitStateChange();
    }
    return this;
  }

  setComponentVisible(id: string, visible: boolean): Dashboard {
    if (typeof visible !== "boolean") {
      throw new NumvizError("`visible` must be a boolean.", {
        code: "INVALID_CONFIG",
        path: "visible"
      });
    }
    const slot = this.#requireWidget(id);
    this.#visible.set(id, visible);
    if (slot.element) slot.element.hidden = !visible;
    this.#emitStateChange();
    return this;
  }

  getState(): DashboardState {
    return {
      filters: this.#filterState(),
      selections: Object.fromEntries(
        [...this.#selections.entries()].map(([id, indices]) => [id, [...indices]])
      ),
      visibleComponents: Object.fromEntries(
        this.#slots.map((slot) => [slot.id, this.#visible.get(slot.id) ?? true])
      ),
      crossFilters: Object.fromEntries(
        [...this.#crossFilters.values()].map((filter) => [
          filter.id,
          {
            id: filter.id,
            source: filter.source as string,
            field: filter.field as string,
            value: this.#filterValues.get(filter.id) ?? null,
            ...(filter.targets !== undefined ? { targets: filter.targets } : {}),
            ...(filter.includeSelf !== undefined ? { includeSelf: filter.includeSelf } : {}),
            ...(filter.multi !== undefined ? { multi: filter.multi } : {})
          } satisfies DashboardCrossFilterState
        ])
      )
    };
  }

  setState(state: DashboardStateUpdate): Dashboard {
    if (!isPlainObject(state)) {
      throw new NumvizError("`state` must be an object.", {
        code: "INVALID_CONFIG",
        path: "state"
      });
    }
    if (state.crossFilters !== undefined) {
      if (!isPlainObject(state.crossFilters)) {
        throw new NumvizError("`state.crossFilters` must be an object.", {
          code: "INVALID_CONFIG",
          path: "state.crossFilters"
        });
      }
      this.#crossFilters.clear();
      for (const [id, entry] of Object.entries(state.crossFilters)) {
        if (!isPlainObject(entry)) continue;
        const cross = entry as unknown as DashboardCrossFilterState;
        if (
          typeof cross.source !== "string" ||
          typeof cross.field !== "string" ||
          !this.#slots.some((slot) => slot.id === cross.source)
        ) {
          continue;
        }
        this.#crossFilters.set(id, {
          id,
          type: cross.multi === true ? "multi-select" : "select",
          field: cross.field,
          label: cross.field,
          defaultValue: null,
          options: [],
          multi: cross.multi === true,
          source: cross.source,
          includeSelf: cross.includeSelf === true,
          ...(cross.targets !== undefined ? { targets: cross.targets } : {})
        });
        this.#filterValues.set(id, cross.value);
      }
    }
    if (state.filters !== undefined) {
      if (!isPlainObject(state.filters)) {
        throw new NumvizError("`state.filters` must be an object.", {
          code: "INVALID_CONFIG",
          path: "state.filters"
        });
      }
      for (const [id, value] of Object.entries(state.filters)) {
        if (this.#findFilter(id)) this.#filterValues.set(id, value as DashboardFilterValue);
      }
    }
    if (state.selections !== undefined) {
      if (!isPlainObject(state.selections)) {
        throw new NumvizError("`state.selections` must be an object.", {
          code: "INVALID_CONFIG",
          path: "state.selections"
        });
      }
      for (const [id, indices] of Object.entries(state.selections)) {
        const slot = this.#slots.find((entry) => entry.id === id);
        if (slot && Array.isArray(indices)) this.#applySelection(slot, indices);
      }
    }
    if (state.visibleComponents !== undefined) {
      if (!isPlainObject(state.visibleComponents)) {
        throw new NumvizError("`state.visibleComponents` must be an object.", {
          code: "INVALID_CONFIG",
          path: "state.visibleComponents"
        });
      }
      for (const [id, visible] of Object.entries(state.visibleComponents)) {
        if (typeof visible !== "boolean") continue;
        const slot = this.#slots.find((entry) => entry.id === id);
        if (!slot) continue;
        this.#visible.set(id, visible);
        if (slot.element) slot.element.hidden = !visible;
      }
    }
    this.#applyFilteredWidgets();
    this.#syncChrome();
    this.#emitStateChange();
    return this;
  }

  setWidgetData(id: string, data: DataInput, columns?: readonly ColumnInput[]): Dashboard {
    const slot = this.#requireWidget(id);
    if (slot.type !== "chart" && slot.type !== "table" && slot.type !== "metric") {
      throw new NumvizError("Only chart, table and metric widgets accept data.", {
        code: "INVALID_CONFIG",
        path: `components.${id}.data`
      });
    }
    const components = this.#source.components.map((component) =>
      component.id === id
        ? ({ ...component, data, ...(columns !== undefined ? { columns } : {}) } as DashboardComponent)
        : component
    );
    return this.update({ ...this.#source, components });
  }

  updateWidget(id: string, patch: Partial<DashboardComponent>): Dashboard {
    const slot = this.#requireWidget(id);
    if (!isPlainObject(patch)) {
      throw new NumvizError("`patch` must be an object.", {
        code: "INVALID_CONFIG",
        path: "patch"
      });
    }
    if (patch.id !== undefined && patch.id !== id) {
      throw new NumvizError("A widget patch cannot change the component id.", {
        code: "INVALID_CONFIG",
        path: "patch.id"
      });
    }
    if (patch.type !== undefined && patch.type !== slot.type) {
      throw new NumvizError("A widget patch cannot change the component type.", {
        code: "INVALID_CONFIG",
        path: "patch.type"
      });
    }
    const components = this.#source.components.map((component) =>
      component.id === id ? ({ ...component, ...patch } as DashboardComponent) : component
    );
    return this.update({ ...this.#source, components });
  }

  on<K extends DashboardEventType>(
    type: K,
    listener: (event: DashboardEventMap[K]) => void
  ): () => void {
    if (typeof listener !== "function") {
      throw new NumvizError("Event listeners must be functions.", {
        code: "INVALID_CONFIG",
        path: "listener"
      });
    }
    const listeners =
      this.#listeners.get(type) ?? new Set<(event: DashboardEventMap[DashboardEventType]) => void>();
    listeners.add(listener as (event: DashboardEventMap[DashboardEventType]) => void);
    this.#listeners.set(type, listeners);
    return () => this.off(type, listener);
  }

  off<K extends DashboardEventType>(
    type: K,
    listener: (event: DashboardEventMap[K]) => void
  ): void {
    const listeners = this.#listeners.get(type);
    if (!listeners) return;
    listeners.delete(listener as (event: DashboardEventMap[DashboardEventType]) => void);
    if (listeners.size === 0) this.#listeners.delete(type);
  }

  async export(options: DashboardExportOptions): Promise<DashboardExportResult> {
    if (this.#destroyed) {
      throw new NumvizError("This dashboard has been destroyed. Create a new dashboard to export it.", {
        code: "DESTROYED"
      });
    }
    const { exportDashboard } = await import("./export.js");
    return exportDashboard(this.#source, options);
  }

  render(target: string | Element): Dashboard {
    if (this.#destroyed) {
      throw new NumvizError("This dashboard has been destroyed. Create a new dashboard to render again.", {
        code: "DESTROYED"
      });
    }
    const container =
      typeof target === "string"
        ? resolveContainer(target, getDocument())
        : resolveContainer(target);
    const doc = container.ownerDocument ?? getDocument();
    ensureBaseStyles(doc);
    this.#clearRendered();
    this.#container = container;
    this.#view = getWindow(doc);
    this.#build(doc);
    return this;
  }

  update(config: DashboardConfig): Dashboard {
    if (this.#destroyed) {
      throw new NumvizError("This dashboard has been destroyed. Create a new dashboard to update it.", {
        code: "DESTROYED"
      });
    }
    const resolved = resolveDashboard(config);
    this.#syncFilterState(resolved);
    this.#syncVisibility(resolved);
    this.#validateComponents(resolved);
    const previous = new Map(this.#slots.map((slot) => [slot.id, slot]));
    const slots: WidgetSlot[] = [];
    const created: WidgetSlot[] = [];
    try {
      for (const component of resolved.components) {
        const existing = previous.get(component.id);
        if (existing && existing.type === component.type) {
          this.#updateSlot(existing, component, resolved);
          previous.delete(component.id);
          slots.push(existing);
        } else {
          if (existing) {
            this.#destroySlot(existing);
            previous.delete(component.id);
          }
          const slot = this.#createSlot(component, resolved);
          slots.push(slot);
          created.push(slot);
        }
      }
    } catch (error) {
      for (const slot of created) this.#destroySlot(slot);
      throw error;
    }
    for (const slot of previous.values()) this.#destroySlot(slot);
    for (const id of [...this.#selections.keys()]) {
      if (!slots.some((slot) => slot.id === id)) this.#selections.delete(id);
    }
    this.#source = config;
    this.#config = resolved;
    this.#slots = slots;
    if (this.#root) {
      this.#syncRoot();
      this.#syncChrome();
      this.#syncWidgets();
    }
    return this;
  }

  refresh(): Dashboard {
    if (this.#destroyed) {
      throw new NumvizError("This dashboard has been destroyed. Create a new dashboard to refresh it.", {
        code: "DESTROYED"
      });
    }
    return this.update(this.#source);
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.#clearRendered();
    for (const slot of this.#slots) this.#destroySlot(slot);
    this.#container = null;
    this.#destroyed = true;
  }

  #requireWidget(id: string): WidgetSlot {
    const slot = this.#slots.find((entry) => entry.id === id);
    if (!slot) {
      throw new NumvizError(`Unknown dashboard widget "${id}".`, {
        code: "INVALID_CONFIG",
        path: "components",
        details: { id }
      });
    }
    return slot;
  }

  #findFilter(id: string): ResolvedDashboardFilter | undefined {
    return this.#config.filters.find((filter) => filter.id === id) ?? this.#crossFilters.get(id);
  }

  #requireFilter(id: string): ResolvedDashboardFilter {
    const filter = this.#findFilter(id);
    if (!filter) {
      throw new NumvizError(`Unknown dashboard filter "${id}".`, {
        code: "INVALID_CONFIG",
        path: "filters",
        details: { id }
      });
    }
    return filter;
  }

  #syncFilterState(config: ResolvedDashboardConfig): void {
    const ids = new Set(config.filters.map((filter) => filter.id));
    for (const filter of config.filters) {
      if (!this.#filterValues.has(filter.id)) {
        this.#filterValues.set(filter.id, filter.defaultValue);
      }
    }
    for (const id of [...this.#filterValues.keys()]) {
      if (!ids.has(id) && !this.#crossFilters.has(id)) this.#filterValues.delete(id);
    }
    for (const [id, filter] of this.#crossFilters) {
      if (!config.components.some((component) => component.id === filter.source)) {
        this.#crossFilters.delete(id);
        this.#filterValues.delete(id);
      }
    }
  }

  #syncVisibility(config: ResolvedDashboardConfig): void {
    const ids = new Set(config.components.map((component) => component.id));
    for (const component of config.components) {
      if (!this.#visible.has(component.id)) {
        this.#visible.set(component.id, component.visible !== false);
      }
    }
    for (const id of [...this.#visible.keys()]) {
      if (!ids.has(id)) this.#visible.delete(id);
    }
    for (const slot of this.#slots) {
      if (slot.element) slot.element.hidden = !(this.#visible.get(slot.id) ?? true);
    }
  }

  #filterState(): Readonly<Record<string, DashboardFilterValue>> {
    const entries: Array<[string, DashboardFilterValue]> = [];
    for (const filter of [...this.#config.filters, ...this.#crossFilters.values()]) {
      entries.push([filter.id, this.#filterValues.get(filter.id) ?? null]);
    }
    return Object.fromEntries(entries);
  }

  #activeFilters(config: ResolvedDashboardConfig = this.#config): readonly ResolvedDashboardFilter[] {
    return [...config.filters, ...this.#crossFilters.values()];
  }

  #columnInputs(columns: readonly unknown[] | undefined): readonly ColumnInput[] | undefined {
    if (!columns) return undefined;
    const inputs: ColumnInput[] = [];
    for (const column of columns) {
      if (typeof column === "string") {
        inputs.push(column);
        continue;
      }
      if (!isPlainObject(column)) continue;
      const key =
        typeof column.key === "string"
          ? column.key
          : typeof column.field === "string"
            ? column.field
            : undefined;
      if (!key) continue;
      inputs.push({
        key,
        ...(typeof column.label === "string" ? { label: column.label } : {}),
        ...(typeof column.type === "string"
          ? { type: column.type as "number" | "date" | "string" | "boolean" }
          : {})
      });
    }
    return inputs.length > 0 ? inputs : undefined;
  }

  #filteredData(
    component: DashboardComponent,
    data: DataInput,
    columns: readonly ColumnInput[] | undefined,
    config: ResolvedDashboardConfig
  ): DataInput {
    return filterDataInput(
      data,
      columns,
      this.#activeFilters(config),
      this.#filterValues,
      component.id
    );
  }

  #applyFilteredWidgets(): void {
    for (const slot of this.#slots) {
      if (!slot.instance) continue;
      if (slot.type === "chart" || slot.type === "table" || slot.type === "metric") {
        this.#updateSlot(slot, slot.component, this.#config);
      }
    }
  }

  #validateFilterValue(filter: ResolvedDashboardFilter, value: DashboardFilterValue): void {
    if (value === null || value === undefined) return;
    if (filter.type === "select" || filter.type === "multi-select") {
      const valid =
        Array.isArray(value)
          ? value.every(
              (entry) =>
                typeof entry === "string" ||
                typeof entry === "number" ||
                typeof entry === "boolean"
            )
          : typeof value === "string" ||
            typeof value === "number" ||
            typeof value === "boolean";
      if (!valid || (Array.isArray(value) && !filter.multi)) {
        throw new NumvizError("This filter requires a primitive option value.", {
          code: "INVALID_CONFIG",
          path: `filters.${filter.id}`,
          details: { received: value }
        });
      }
      return;
    }
    if (filter.type === "search") {
      if (typeof value !== "string") {
        throw new NumvizError("Search filters require a string value.", {
          code: "INVALID_CONFIG",
          path: `filters.${filter.id}`,
          details: { received: value }
        });
      }
      return;
    }
    if (filter.type === "date-range" || filter.type === "number-range") {
      if (!isPlainObject(value) || Array.isArray(value)) {
        throw new NumvizError("Range filters require a `{ from, to }` object.", {
          code: "INVALID_CONFIG",
          path: `filters.${filter.id}`,
          details: { received: value }
        });
      }
      const range = value as { from?: unknown; to?: unknown };
      const valid = (entry: unknown): boolean =>
        entry === undefined ||
        entry === null ||
        (filter.type === "number-range"
          ? typeof entry === "number" && Number.isFinite(entry)
          : typeof entry === "string");
      if (!valid(range.from) || !valid(range.to)) {
        throw new NumvizError("Range filter values must contain valid `from` and `to` values.", {
          code: "INVALID_CONFIG",
          path: `filters.${filter.id}`,
          details: { received: value }
        });
      }
    }
  }

  #sameFilterValue(left: DashboardFilterValue | undefined, right: DashboardFilterValue): boolean {
    try {
      return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
    } catch {
      return left === right;
    }
  }

  #setFilterValue(
    id: string,
    value: DashboardFilterValue,
    source: string | undefined,
    fromUi: boolean
  ): Dashboard {
    const filter = this.#requireFilter(id);
    this.#validateFilterValue(filter, value);
    if (this.#sameFilterValue(this.#filterValues.get(id), value)) return this;
    this.#filterValues.set(id, value);
    this.#applyFilteredWidgets();
    if (!fromUi) this.#syncChrome();
    this.#emit("filterchange", {
      type: "filterchange",
      id,
      value,
      filters: this.#filterState(),
      ...(source !== undefined ? { source } : {})
    });
    this.#emitStateChange();
    return this;
  }

  #applySelection(slot: WidgetSlot, indices: readonly number[]): void {
    if (!Array.isArray(indices)) {
      throw new NumvizError("Selection must be an array of row indices.", {
        code: "INVALID_CONFIG",
        path: `components.${slot.id}.selection`
      });
    }
    const next = indices.map((value, index) => {
      if (!Number.isInteger(value) || value < 0) {
        throw new NumvizError("Selection indices must be non-negative integers.", {
          code: "INVALID_CONFIG",
          path: `components.${slot.id}.selection[${index}]`,
          details: { received: value }
        });
      }
      return value;
    });
    if (slot.instance && slot.type === "table") {
      (slot.instance as Table).setSelection(next, false);
    }
    if (slot.instance && slot.type === "chart") {
      (slot.instance as Chart).setSelectedIndex(next.length > 0 ? (next[0] as number) : null);
    }
    this.#selections.set(slot.id, [...next]);
  }

  #clearSourceSelection(sourceId: string): void {
    const slot = this.#slots.find((entry) => entry.id === sourceId);
    if (slot?.instance && slot.type === "chart") {
      (slot.instance as Chart).setSelectedIndex(null);
    }
    if (slot?.instance && slot.type === "table") {
      (slot.instance as Table).setSelection([], false);
    }
    this.#selections.set(sourceId, []);
  }

  #toFilterValue(value: NormalizedValue | unknown): string | number | boolean | null {
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      return value;
    }
    if (value === null || value === undefined) return null;
    return String(value);
  }

  #crossFilterId(sourceId: string): string {
    return `crossfilter:${sourceId}`;
  }

  #applyCrossFilter(
    sourceId: string,
    field: string,
    values: readonly (string | number | boolean)[],
    config: DashboardCrossFilterConfig,
    toggle = false
  ): void {
    const id = this.#crossFilterId(sourceId);
    const existing = this.#crossFilters.get(id);
    const multi = config.multi === true || values.length > 1;
    const current = this.#filterValues.get(id);
    let next = values;
    if (
      toggle &&
      !multi &&
      existing !== undefined &&
      current !== null &&
      current !== undefined &&
      values.length === 1 &&
      this.#sameFilterValue(current, values[0] as string | number | boolean)
    ) {
      next = [];
    }
    if (next.length === 0) {
      this.#crossFilters.delete(id);
      this.#filterValues.delete(id);
      this.#clearSourceSelection(sourceId);
      this.#applyFilteredWidgets();
      this.#syncChrome();
      this.#emit("filterchange", {
        type: "filterchange",
        id,
        value: null,
        filters: this.#filterState(),
        source: sourceId
      });
      this.#emitStateChange();
      return;
    }
    const filter: ResolvedDashboardFilter = {
      id,
      type: multi ? "multi-select" : "select",
      field,
      label: field,
      defaultValue: null,
      options: [],
      multi,
      source: sourceId,
      includeSelf: config.includeSelf === true,
      ...(config.targets !== undefined ? { targets: config.targets } : {})
    };
    this.#crossFilters.set(id, filter);
    this.#filterValues.set(id, multi ? [...next] : (next[0] as string | number | boolean));
    this.#applyFilteredWidgets();
    this.#syncChrome();
    this.#emit("filterchange", {
      type: "filterchange",
      id,
      value: this.#filterValues.get(id) ?? null,
      filters: this.#filterState(),
      source: sourceId
    });
    this.#emitStateChange();
  }

  #handleChartClick(
    slot: WidgetSlot,
    component: DashboardComponent & { type: "chart" },
    event: ChartClickEvent
  ): void {
    this.#emit("widgetclick", { type: "widgetclick", id: slot.id, event });
    const cross = component.crossFilter;
    if (!cross) return;
    const chart = slot.instance as Chart | null;
    const field = cross.field ?? component.x ?? component.category ?? "x";
    const row = chart?.data.rows[event.index];
    const value = this.#toFilterValue(row?.values[field] ?? event.label);
    if (value === null) return;
    const selected = this.#selections.get(slot.id) ?? [];
    const isSelected = selected.length === 1 && selected[0] === event.index;
    this.#selections.set(slot.id, isSelected ? [] : [event.index]);
    chart?.setSelectedIndex(isSelected ? null : event.index);
    this.#emit("selectionchange", {
      type: "selectionchange",
      id: slot.id,
      indices: [...(this.#selections.get(slot.id) ?? [])],
      source: slot.id
    });
    this.#applyCrossFilter(slot.id, field, [value], cross, true);
  }

  #handleTableSelection(
    slot: WidgetSlot,
    component: DashboardComponent & { type: "table" },
    indices: readonly number[],
    rows: readonly Readonly<Record<string, unknown>>[]
  ): void {
    this.#selections.set(slot.id, [...indices]);
    this.#emit("selectionchange", {
      type: "selectionchange",
      id: slot.id,
      indices: [...indices],
      source: slot.id
    });
    const cross = component.crossFilter;
    if (!cross) return;
    const firstColumn = component.columns?.find(
      (column) => typeof column === "string" || column.field !== undefined
    );
    const field = cross.field ?? (typeof firstColumn === "string" ? firstColumn : firstColumn?.field);
    if (!field) return;
    const values = rows
      .map((row) => this.#toFilterValue(row[field]))
      .filter((value): value is string | number | boolean => value !== null);
    this.#applyCrossFilter(slot.id, field, values, cross);
  }

  #collectFilterOptions(
    filter: ResolvedDashboardFilter
  ): readonly { label: string; value: string | number | boolean }[] {
    if (!filter.field) return [];
    const datasets: Array<{ data: DataInput; columns?: readonly ColumnInput[] }> = [];
    for (const slot of this.#slots) {
      if (filter.targets !== undefined && !filter.targets.includes(slot.id)) continue;
      if (slot.type !== "chart" && slot.type !== "table" && slot.type !== "metric") continue;
      const component = slot.component as DashboardComponent & {
        data: DataInput;
        columns?: readonly ColumnInput[];
      };
      if (component.data !== undefined) {
        datasets.push({ data: component.data, columns: component.columns });
      }
    }
    return collectFilterOptions(datasets, filter.field);
  }

  #filterBarValue(filter: ResolvedDashboardFilter): DashboardFilterValue {
    return this.#filterValues.get(filter.id) ?? null;
  }

  #formatFilterValue(value: DashboardFilterValue): string {
    if (value === null) return "All";
    if (Array.isArray(value)) return value.map(String).join(", ");
    if (isPlainObject(value)) {
      const range = value as { from?: unknown; to?: unknown };
      const from =
        range.from === undefined || range.from === null || range.from === ""
          ? ""
          : String(range.from);
      const to =
        range.to === undefined || range.to === null || range.to === ""
          ? ""
          : String(range.to);
      return `${from || "Any"} – ${to || "Any"}`;
    }
    return String(value);
  }

  #appendFilterField(
    bar: HTMLElement,
    filter: ResolvedDashboardFilter,
    control: Node | null
  ): void {
    const doc = bar.ownerDocument;
    const wrapper = doc.createElement("div");
    wrapper.className = [
      "numviz-dashboard__filter",
      ...(filter.className ? filter.className.split(/\s+/).filter(Boolean) : [])
    ].join(" ");
    wrapper.dataset.nvFilterId = filter.id;
    const label = doc.createElement("label");
    label.className = "numviz-dashboard__filter-label";
    label.textContent = filter.label;
    wrapper.appendChild(label);
    if (control) {
      if (isDomNode(control)) {
        if ("setAttribute" in control) {
          (control as Element).setAttribute("aria-label", filter.label);
        }
        wrapper.appendChild(control);
      } else {
        wrapper.appendChild(control);
      }
    }
    bar.appendChild(wrapper);
  }

  #buildFilterControl(filter: ResolvedDashboardFilter): Node | null {
    const doc = this.#root?.ownerDocument ?? getDocument();
    const value = this.#filterBarValue(filter);
    if (filter.type === "select" || filter.type === "multi-select") {
      const options =
        filter.options.length > 0 ? filter.options : this.#collectFilterOptions(filter);
      const select = doc.createElement("select");
      select.className = "numviz-dashboard__filter-control";
      select.multiple = filter.multi;
      if (!filter.multi) {
        const all = doc.createElement("option");
        all.value = "";
        all.textContent = filter.placeholder ?? "All";
        select.appendChild(all);
      }
      options.forEach((option, index) => {
        const element = doc.createElement("option");
        element.value = String(option.value);
        element.textContent = option.label;
        element.dataset.nvOption = String(index);
        const selected = Array.isArray(value) ? value : value === null ? [] : [value];
        if (selected.some((entry) => String(entry) === String(option.value))) {
          element.selected = true;
        }
        select.appendChild(element);
      });
      if (!filter.multi && value !== null && !Array.isArray(value)) {
        select.value = String(value);
      }
      select.addEventListener("change", () => {
        if (filter.multi) {
          const selected = [...select.selectedOptions]
            .map((option) => {
              const index = Number(option.dataset.nvOption);
              return options[index]?.value;
            })
            .filter((entry): entry is string | number | boolean => entry !== undefined);
          this.#setFilterValue(
            filter.id,
            selected.length > 0 ? selected : null,
            undefined,
            true
          );
        } else {
          const option = select.selectedOptions[0];
          const index = option?.dataset.nvOption;
          const next = index === undefined ? null : (options[Number(index)]?.value ?? null);
          this.#setFilterValue(filter.id, next, undefined, true);
        }
      });
      return select;
    }
    if (filter.type === "search") {
      const input = doc.createElement("input");
      input.type = "search";
      input.className = "numviz-dashboard__filter-control";
      input.placeholder = filter.placeholder ?? `Search ${filter.label}`;
      input.value = typeof value === "string" ? value : "";
      input.addEventListener("input", () => {
        this.#setFilterValue(filter.id, input.value, undefined, true);
      });
      return input;
    }
    if (filter.type === "date-range" || filter.type === "number-range") {
      const group = doc.createElement("div");
      group.className = "numviz-dashboard__filter-range";
      const range = isPlainObject(value) ? (value as { from?: unknown; to?: unknown }) : {};
      const make = (key: "from" | "to"): HTMLInputElement => {
        const input = doc.createElement("input");
        input.type = filter.type === "date-range" ? "date" : "number";
        input.className = "numviz-dashboard__filter-control";
        if (filter.type === "date-range") {
          if (filter.min !== undefined) input.min = String(filter.min);
          if (filter.max !== undefined) input.max = String(filter.max);
        } else {
          if (filter.min !== undefined) input.min = String(filter.min);
          if (filter.max !== undefined) input.max = String(filter.max);
          if (filter.step !== undefined) input.step = String(filter.step);
        }
        input.placeholder = key === "from" ? "From" : "To";
        const raw = range[key];
        input.value = raw === undefined || raw === null ? "" : String(raw);
        input.addEventListener("change", () => {
          const read = (entry: HTMLInputElement): string | number | null => {
            if (entry.value === "") return null;
            if (filter.type === "number-range") {
              const parsed = Number(entry.value);
              return Number.isFinite(parsed) ? parsed : null;
            }
            return entry.value;
          };
          const from = read(group.children[0] as HTMLInputElement);
          const to = read(group.children[1] as HTMLInputElement);
          this.#setFilterValue(
            filter.id,
            from === null && to === null ? null : { from, to },
            undefined,
            true
          );
        });
        return input;
      };
      group.append(make("from"), make("to"));
      return group;
    }
    if (filter.type === "custom" && filter.render) {
      const result = filter.render({
        id: filter.id,
        document: doc,
        dashboard: this,
        filter: filter as never,
        value,
        setValue: (next: DashboardFilterValue) =>
          this.#setFilterValue(filter.id, next, undefined, true)
      });
      if (result === null) return null;
      if (typeof result === "string") {
        const text = doc.createElement("span");
        text.className = "numviz-dashboard__filter-control";
        text.textContent = result;
        return text;
      }
      if (!isDomNode(result)) {
        throw new NumvizError("A custom filter must return a DOM node, a string or null.", {
          code: "INVALID_CONFIG",
          path: `filters.${filter.id}.render`
        });
      }
      return result;
    }
    return null;
  }

  #buildFilterBar(doc: Document): HTMLElement | null {
    const filters = [...this.#config.filters, ...this.#crossFilters.values()];
    if (filters.length === 0) return null;
    const bar = doc.createElement("div");
    bar.className = "numviz-dashboard__filters";
    bar.setAttribute("role", "group");
    bar.setAttribute("aria-label", "Dashboard filters");
    for (const filter of this.#config.filters) {
      this.#appendFilterField(bar, filter, this.#buildFilterControl(filter));
    }
    for (const filter of this.#crossFilters.values()) {
      const chip = doc.createElement("span");
      chip.className = "numviz-dashboard__filter-chip";
      chip.dataset.nvFilterId = filter.id;
      const label = doc.createElement("span");
      label.textContent = `${filter.label}: ${this.#formatFilterValue(
        this.#filterBarValue(filter)
      )}`;
      const clear = doc.createElement("button");
      clear.type = "button";
      clear.className = "numviz-dashboard__filter-chip-clear";
      clear.setAttribute("aria-label", `Clear ${filter.label} filter`);
      clear.textContent = "×";
      clear.addEventListener("click", () => this.clearFilter(filter.id));
      chip.append(label, clear);
      bar.appendChild(chip);
    }
    const hasActive =
      this.#config.filters.some((filter) => isFilterActive(this.#filterValues.get(filter.id))) ||
      this.#crossFilters.size > 0;
    if (hasActive) {
      const clear = doc.createElement("button");
      clear.type = "button";
      clear.className = "numviz-dashboard__filter-clear";
      clear.textContent = "Clear filters";
      clear.addEventListener("click", () => this.clearFilters());
      bar.appendChild(clear);
    }
    return bar;
  }

  #emit<K extends DashboardEventType>(type: K, event: DashboardEventMap[K]): void {
    const listeners = this.#listeners.get(type);
    if (!listeners) return;
    for (const listener of [...listeners]) {
      listener(event as DashboardEventMap[DashboardEventType]);
    }
  }

  #emitStateChange(): void {
    this.#emit("statechange", { type: "statechange", state: this.getState() });
  }

  #publicWidget(slot: WidgetSlot): DashboardWidget {
    return {
      id: slot.id,
      type: slot.type,
      component: slot.component,
      instance: slot.instance,
      element: slot.element
    };
  }

  #validateComponents(config: ResolvedDashboardConfig): void {
    const engines: Array<Chart | Table | Metric> = [];
    try {
      for (const component of config.components) {
        const engine = this.#createEngine(component, config);
        if (engine) engines.push(engine);
      }
    } finally {
      for (const engine of engines) engine.destroy();
    }
  }

  #createSlot(component: DashboardComponent, config: ResolvedDashboardConfig): WidgetSlot {
    return {
      id: component.id,
      type: component.type,
      component,
      instance: this.#createEngine(component, config),
      element: null,
      body: null,
      customCleanup: null
    };
  }

  #createEngine(
    component: DashboardComponent,
    config: ResolvedDashboardConfig
  ): Chart | Table | Metric | null {
    if (component.type === "chart") {
      return createChart(this.#chartConfig(component, config));
    }
    if (component.type === "table") {
      return createTable(this.#tableConfig(component, config));
    }
    if (component.type === "metric") {
      return createMetric(this.#metricConfig(component, config));
    }
    return null;
  }

  #mergedTheme(
    theme: ThemeConfig | undefined,
    config: ResolvedDashboardConfig
  ): ThemeConfig | undefined {
    const merged = { ...config.theme, ...(theme ?? {}) };
    return Object.keys(merged).length > 0 ? merged : undefined;
  }

  #chartConfig(
    component: DashboardComponent & { type: "chart" },
    config: ResolvedDashboardConfig
  ): ChartConfig {
    const componentConfig: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(component)) {
      if (
        key === "id" ||
        key === "type" ||
        key === "chartType" ||
        key === "layout" ||
        key === "style" ||
        key === "visible" ||
        key === "crossFilter"
      ) {
        continue;
      }
      if (value !== undefined) componentConfig[key] = value;
    }
    componentConfig.data = this.#filteredData(
      component,
      component.data,
      this.#columnInputs(component.columns),
      config
    );
    const theme = this.#mergedTheme(component.theme, config);
    if (theme) componentConfig.theme = theme;
    const userOnClick = componentConfig.onClick as ChartConfig["onClick"];
    componentConfig.onClick = (event: ChartClickEvent) => {
      userOnClick?.(event);
      this.#handleChartClick(this.#requireWidget(component.id), component, event);
    };
    return {
      ...(componentConfig as unknown as Omit<ChartConfig, "type">),
      type: component.chartType
    } as ChartConfig;
  }

  #tableConfig(
    component: DashboardComponent & { type: "table" },
    config: ResolvedDashboardConfig
  ): TableConfig {
    const componentConfig: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(component)) {
      if (
        key === "id" ||
        key === "type" ||
        key === "layout" ||
        key === "style" ||
        key === "visible" ||
        key === "crossFilter"
      ) {
        continue;
      }
      if (value !== undefined) componentConfig[key] = value;
    }
    componentConfig.data = this.#filteredData(
      component,
      component.data,
      this.#columnInputs(component.columns),
      config
    );
    const userSelection = componentConfig.onSelectionChange as TableConfig["onSelectionChange"];
    componentConfig.onSelectionChange = (
      indices: readonly number[],
      rows: readonly Readonly<Record<string, unknown>>[]
    ) => {
      userSelection?.(indices, rows);
      this.#handleTableSelection(this.#requireWidget(component.id), component, indices, rows);
    };
    if (component.crossFilter && componentConfig.selectable === undefined) {
      componentConfig.selectable = true;
    }
    const theme = this.#mergedTheme(component.theme, config);
    if (theme) componentConfig.theme = theme;
    if (componentConfig.locale === undefined && config.format.locale !== undefined) {
      componentConfig.locale = config.format.locale;
    }
    if (config.format.currency !== undefined && Array.isArray(componentConfig.columns)) {
      componentConfig.columns = (componentConfig.columns as readonly unknown[]).map((column) => {
        if (
          typeof column === "object" &&
          column !== null &&
          (column as { format?: unknown }).format === "currency" &&
          (column as { currency?: unknown }).currency === undefined
        ) {
          return { ...column, currency: config.format.currency };
        }
        return column;
      });
    }
    return componentConfig as unknown as TableConfig;
  }

  #metricConfig(
    component: DashboardComponent & { type: "metric" },
    config: ResolvedDashboardConfig
  ): MetricConfig {
    const componentConfig: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(component)) {
      if (
        key === "id" ||
        key === "type" ||
        key === "layout" ||
        key === "style" ||
        key === "visible" ||
        key === "crossFilter"
      ) {
        continue;
      }
      if (value !== undefined) componentConfig[key] = value;
    }
    componentConfig.data = this.#filteredData(
      component,
      component.data,
      this.#columnInputs(component.columns),
      config
    );
    componentConfig.name = component.name ?? component.title ?? component.id;
    const theme = this.#mergedTheme(component.theme, config);
    if (theme) componentConfig.theme = theme;
    if (componentConfig.locale === undefined && config.format.locale !== undefined) {
      componentConfig.locale = config.format.locale;
    }
    if (componentConfig.currency === undefined && config.format.currency !== undefined) {
      componentConfig.currency = config.format.currency;
    }
    return componentConfig as unknown as MetricConfig;
  }

  #updateSlot(
    slot: WidgetSlot,
    component: DashboardComponent,
    config: ResolvedDashboardConfig
  ): void {
    slot.component = component;
    if (component.type === "chart") {
      if (slot.instance && !slot.instance.isDestroyed) {
        (slot.instance as Chart).update(this.#chartConfig(component, config));
      } else {
        slot.instance = createChart(this.#chartConfig(component, config));
        if (slot.body) {
          slot.body.replaceChildren();
          slot.instance.render(slot.body);
        }
      }
    } else if (component.type === "table") {
      (slot.instance as Table).update(this.#tableConfig(component, config));
    } else if (component.type === "metric") {
      (slot.instance as Metric).update(this.#metricConfig(component, config));
    } else {
      slot.instance = null;
      if (slot.body) this.#renderContent(slot, slot.body.ownerDocument, slot.body);
    }
    if (slot.element) this.#applyWidgetAttributes(slot);
  }

  #build(doc: Document): void {
    this.#ensureStyles(doc);
    const root = doc.createElement("section");
    root.className = "numviz-root numviz-dashboard";
    root.dataset.numvizRoot = "dashboard";
    root.dataset.nvDashboard = this.#scope;
    root.setAttribute("role", "region");
    this.#root = root;
    this.#container?.appendChild(root);
    this.#syncRoot();
    const grid = doc.createElement("div");
    grid.className = "numviz-dashboard__grid";
    this.#grid = grid;
    root.appendChild(grid);
    this.#syncRoot();
    this.#syncChrome();
    this.#syncWidgets();
  }

  #syncRoot(): void {
    const root = this.#root;
    if (!root) return;
    const config = this.#config;
    const doc = root.ownerDocument;
    root.className = [
      "numviz-root",
      "numviz-dashboard",
      this.#scope,
      `numviz-dashboard--${config.layout.variant}`,
      ...(config.className ? config.className.split(/\s+/).filter(Boolean) : [])
    ].join(" ");
    root.setAttribute("aria-label", config.title ?? "Dashboard");
    root.style.padding = config.layout.padding;
    root.style.gap = "20px";
    root.style.background = config.background ?? "";
    applyThemeTokens(root, resolveTheme(config.theme, this.#view));
    this.#ensureStyles(doc);
    this.#style = doc.getElementById(dashboardStyleId(this.#scope)) as HTMLStyleElement | null;
    if (this.#grid) {
      this.#grid.style.columnGap = config.layout.gap;
      this.#grid.style.rowGap = config.layout.rowGap;
      this.#grid.style.alignItems = config.layout.align;
      this.#grid.style.gridTemplateRows = config.layout.rows ?? "";
      this.#grid.style.gridAutoRows = config.layout.autoRows ?? "";
    }
  }

  #syncChrome(): void {
    const root = this.#root;
    const grid = this.#grid;
    if (!root || !grid) return;
    const doc = root.ownerDocument;
    this.#header?.remove();
    this.#filterBar?.remove();
    this.#footer?.remove();
    this.#header = this.#buildHeader(doc, this.#config.header);
    if (this.#header) root.insertBefore(this.#header, grid);
    this.#filterBar = this.#buildFilterBar(doc);
    if (this.#filterBar) root.insertBefore(this.#filterBar, grid);
    this.#footer = this.#buildFooter(doc, this.#config.footer);
    if (this.#footer) root.appendChild(this.#footer);
  }

  #buildHeader(doc: Document, header: ResolvedDashboardHeader | null): HTMLElement | null {
    if (!header) return null;
    const element = doc.createElement("header");
    element.className = "numviz-dashboard__header";
    if (header.className) element.classList.add(...header.className.split(/\s+/).filter(Boolean));
    if (header.logo) {
      const logo = doc.createElement("img");
      logo.className = "numviz-dashboard__logo";
      logo.src = header.logo;
      logo.alt = "";
      logo.decoding = "async";
      element.appendChild(logo);
    }
    if (header.title) {
      const title = doc.createElement("h1");
      title.className = "numviz-dashboard__title";
      title.textContent = header.title;
      element.appendChild(title);
    }
    if (header.description) {
      const description = doc.createElement("p");
      description.className = "numviz-dashboard__description";
      description.textContent = header.description;
      element.appendChild(description);
    }
    if (header.text) {
      const text = doc.createElement("p");
      text.className = "numviz-dashboard__header-text";
      text.textContent = header.text;
      element.appendChild(text);
    }
    return element;
  }

  #buildFooter(doc: Document, footer: ResolvedDashboardFooter | null): HTMLElement | null {
    if (!footer) return null;
    const element = doc.createElement("footer");
    element.className = "numviz-dashboard__footer";
    if (footer.className) element.classList.add(...footer.className.split(/\s+/).filter(Boolean));
    element.textContent = footer.text;
    return element;
  }

  #syncWidgets(): void {
    const grid = this.#grid;
    if (!grid) return;
    const doc = grid.ownerDocument;
    for (const [index, slot] of this.#slots.entries()) {
      if (!slot.element) {
        slot.element = this.#buildWidgetElement(doc, slot);
        slot.body = slot.element.querySelector<HTMLElement>(".numviz-dashboard__body");
        slot.element.dataset.nvSlot = String(index);
        slot.element.hidden = !(this.#visible.get(slot.id) ?? true);
        grid.appendChild(slot.element);
        this.#mountSlot(slot, doc);
      } else {
        this.#applyWidgetAttributes(slot);
        slot.element.dataset.nvSlot = String(index);
        grid.appendChild(slot.element);
      }
    }
  }

  #buildWidgetElement(doc: Document, slot: WidgetSlot): HTMLElement {
    const element = doc.createElement("article");
    element.dataset.nvComponentId = slot.id;
    element.dataset.nvComponentType = slot.type;
    const body = doc.createElement("div");
    body.className = "numviz-dashboard__body";
    element.appendChild(body);
    this.#applyWidgetAttributesContent(element, slot);
    return element;
  }

  #applyWidgetAttributes(slot: WidgetSlot): void {
    const element = slot.element;
    if (!element) return;
    this.#applyWidgetAttributesContent(element, slot);
  }

  #applyWidgetAttributesContent(element: HTMLElement, slot: WidgetSlot): void {
    const type = slot.type;
    element.className = [
      "numviz-dashboard__widget",
      ...(isContentType(type) ? ["numviz-dashboard__widget--content"] : []),
      ...(type === "image" ? ["numviz-dashboard__widget--media"] : [])
    ].join(" ");
    element.dataset.nvComponentId = slot.id;
    element.dataset.nvComponentType = type;
    element.setAttribute("aria-label", widgetLabel(slot.component));
    element.style.gridColumn = "";
    element.style.gridRow = "";
    element.style.order = "";
    element.style.width = "";
    element.style.height = "";
    element.style.minWidth = "";
    element.style.minHeight = "";
    element.style.alignSelf = "";
    element.style.background = "";
    element.style.border = "";
    element.style.borderRadius = "";
    element.style.padding = "";
    element.style.boxShadow = "";
    applyWidgetLayout(element, slot.component.layout as DashboardComponentLayout | undefined);
    applyWidgetStyle(
      element,
      this.#config.widgetStyle as DashboardWidgetStyle,
      slot.component.style as DashboardWidgetStyle | undefined
    );
  }

  #mountSlot(slot: WidgetSlot, doc: Document): void {
    const body = slot.body;
    if (!body) return;
    if (slot.instance) {
      slot.instance.render(body);
      return;
    }
    this.#renderContent(slot, doc, body);
  }

  #renderContent(slot: WidgetSlot, doc: Document, body: HTMLElement): void {
    const component = slot.component;
    if (slot.customCleanup) {
      slot.customCleanup();
      slot.customCleanup = null;
    }
    body.replaceChildren();
    if (component.type === "heading") {
      const heading = doc.createElement(`h${component.level ?? 2}`);
      heading.className = "numviz-dashboard__heading";
      heading.dataset.level = String(component.level ?? 2);
      heading.textContent = component.text;
      body.appendChild(heading);
      return;
    }
    if (component.type === "text") {
      const text = doc.createElement("p");
      text.className = "numviz-dashboard__text";
      text.textContent = component.text;
      body.appendChild(text);
      return;
    }
    if (component.type === "description") {
      const text = doc.createElement("p");
      text.className = "numviz-dashboard__description-text";
      text.textContent = component.text;
      body.appendChild(text);
      return;
    }
    if (component.type === "divider") {
      const divider = doc.createElement("hr");
      divider.className = "numviz-dashboard__divider";
      body.appendChild(divider);
      return;
    }
    if (component.type === "image") {
      const figure = doc.createElement("figure");
      figure.className = "numviz-dashboard__figure";
      const image = doc.createElement("img");
      image.className = "numviz-dashboard__image";
      image.src = component.src;
      image.alt = component.alt;
      image.loading = "lazy";
      image.decoding = "async";
      if (component.width !== undefined) image.style.width = String(component.width);
      if (component.height !== undefined) image.style.height = String(component.height);
      if (component.fit !== undefined) image.style.objectFit = component.fit;
      figure.appendChild(image);
      if (component.caption) {
        const caption = doc.createElement("figcaption");
        caption.className = "numviz-dashboard__caption";
        caption.textContent = component.caption;
        figure.appendChild(caption);
      }
      body.appendChild(figure);
      return;
    }
    if (component.type === "custom") {
      const custom = component as DashboardCustomComponent;
      const result = custom.render({
        id: custom.id,
        document: doc,
        dashboard: this,
        component: custom
      });
      if (typeof custom.destroy === "function") {
        slot.customCleanup = () => custom.destroy?.();
      }
      if (typeof result === "string") {
        body.textContent = result;
        return;
      }
      if (result === null) return;
      if (!isDomNode(result)) {
        throw new NumvizError(
          "A custom dashboard component must return a DOM node, a string or null.",
          {
            code: "INVALID_CONFIG",
            path: `components.${custom.id}.render`,
            details: { received: typeof result }
          }
        );
      }
      body.appendChild(result);
      return;
    }
    if (component.type === "chart" || component.type === "table" || component.type === "metric") {
      return;
    }
    const container = doc.createElement("div");
    container.className = "numviz-dashboard__custom";
    body.appendChild(container);
  }

  #ensureStyles(doc: Document): void {
    const id = dashboardStyleId(this.#scope);
    let style = doc.getElementById(id) as HTMLStyleElement | null;
    if (!style) {
      style = doc.createElement("style");
      style.id = id;
      const head = doc.head ?? doc.documentElement;
      head.appendChild(style);
    }
    style.textContent = dashboardCss(this.#scope, this.#config.layout, this.#config.components);
    this.#style = style;
  }

  #destroySlot(slot: WidgetSlot): void {
    if (slot.customCleanup) {
      slot.customCleanup();
      slot.customCleanup = null;
    }
    slot.instance?.destroy();
    slot.instance = null;
    slot.element?.remove();
    slot.element = null;
    slot.body = null;
  }

  #clearRendered(): void {
    for (const slot of this.#slots) {
      if (slot.customCleanup) {
        slot.customCleanup();
        slot.customCleanup = null;
      }
      slot.element = null;
      slot.body = null;
    }
    this.#root?.remove();
    this.#root = null;
    this.#header?.remove();
    this.#header = null;
    this.#filterBar?.remove();
    this.#filterBar = null;
    this.#grid = null;
    this.#footer = null;
    this.#style?.remove();
    this.#style = null;
    this.#container = null;
    this.#view = undefined;
  }
}

/** Create a responsive dashboard from independent Numviz components. */
export function createDashboard(config: DashboardConfig): Dashboard {
  return new NumvizDashboard(config);
}
