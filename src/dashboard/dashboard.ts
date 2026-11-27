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
  #slots: WidgetSlot[];
  #scope: string;

  #root: HTMLElement | null = null;
  #container: Element | null = null;
  #view: DashboardWindow | undefined;
  #header: HTMLElement | null = null;
  #grid: HTMLElement | null = null;
  #footer: HTMLElement | null = null;
  #style: HTMLStyleElement | null = null;
  #destroyed = false;

  constructor(config: DashboardConfig) {
    const resolved = resolveDashboard(config);
    this.#source = config;
    this.#config = resolved;
    this.#scope = `numviz-dashboard-${(dashboardCounter += 1)}`;
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
      if (key === "id" || key === "type" || key === "chartType" || key === "layout" || key === "style") {
        continue;
      }
      if (value !== undefined) componentConfig[key] = value;
    }
    const theme = this.#mergedTheme(component.theme, config);
    if (theme) componentConfig.theme = theme;
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
      if (key === "id" || key === "type" || key === "layout" || key === "style") continue;
      if (value !== undefined) componentConfig[key] = value;
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
      if (key === "id" || key === "type" || key === "layout" || key === "style") continue;
      if (value !== undefined) componentConfig[key] = value;
    }
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
    this.#footer?.remove();
    this.#header = this.#buildHeader(doc, this.#config.header);
    if (this.#header) root.insertBefore(this.#header, grid);
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
