import { NumvizError } from "../errors.js";
import { resolveTheme } from "../theme/tokens.js";
import type { ThemeTokens } from "../types.js";
import {
  applyThemeTokens,
  ensureBaseStyles,
  ensureStyles,
  getDocument,
  getWindow,
  isDomNode,
  resolveContainer
} from "../utils/dom.js";
import { computeMetric } from "./compute.js";
import { formatPercentageChange } from "./format.js";
import { resolveMetric, type ResolvedMetric } from "./resolve.js";
import { METRIC_CSS, METRIC_STYLE_ID } from "./styles.js";
import type {
  Metric,
  MetricComparisonResult,
  MetricConfig,
  MetricResult
} from "./types.js";

type MetricWindow = Window & typeof globalThis;

const TREND_GLYPHS = { up: "↑", down: "↓", flat: "→" } as const;

class NumvizMetric implements Metric {
  #resolved: ResolvedMetric;
  #result: MetricResult;
  #container: Element | null = null;
  #root: HTMLElement | null = null;
  #view: MetricWindow | undefined;
  #destroyed = false;

  constructor(config: MetricConfig) {
    this.#resolved = resolveMetric(config);
    this.#result = computeMetric(this.#resolved);
  }

  get config(): MetricConfig {
    return this.#resolved.config;
  }

  get result(): MetricResult {
    return this.#result;
  }

  get element(): HTMLElement | null {
    return this.#root;
  }

  get isDestroyed(): boolean {
    return this.#destroyed;
  }

  render(target: string | Element): Metric {
    if (this.#destroyed) {
      throw new NumvizError("This metric has been destroyed. Create a new metric to render again.", {
        code: "DESTROYED"
      });
    }
    const container =
      typeof target === "string"
        ? resolveContainer(target, getDocument())
        : resolveContainer(target);
    const doc = container.ownerDocument ?? getDocument();
    ensureBaseStyles(doc);
    ensureStyles(doc, METRIC_STYLE_ID, METRIC_CSS);
    this.#clear();
    this.#container = container;
    this.#view = getWindow(doc);
    this.#build();
    return this;
  }

  update(config: MetricConfig): Metric {
    this.#resolved = resolveMetric(config);
    this.#result = computeMetric(this.#resolved);
    if (this.#container) this.#build();
    return this;
  }

  setData(data: MetricConfig["data"]): Metric {
    return this.update({ ...this.#resolved.config, data });
  }

  setLoading(loading: boolean): Metric {
    if (typeof loading !== "boolean") {
      throw new NumvizError("`loading` must be a boolean.", {
        code: "INVALID_CONFIG",
        path: "loading"
      });
    }
    return this.update({ ...this.#resolved.config, loading });
  }

  setError(message: string | null): Metric {
    if (message !== null && (typeof message !== "string" || message.trim() === "")) {
      throw new NumvizError("`error` must be a non-empty string or null.", {
        code: "INVALID_CONFIG",
        path: "error"
      });
    }
    return this.update({ ...this.#resolved.config, error: message });
  }

  refresh(): Metric {
    this.#result = computeMetric(this.#resolved);
    if (this.#container) this.#build();
    return this;
  }

  destroy(): void {
    this.#clear();
    this.#container = null;
    this.#destroyed = true;
  }

  #tokens(): ThemeTokens {
    return resolveTheme(this.#resolved.config.theme, this.#view);
  }

  #clear(): void {
    this.#root?.remove();
    this.#root = null;
  }

  #build(): void {
    const container = this.#container;
    if (!container) return;
    const doc = container.ownerDocument;
    const config = this.#resolved.config;
    const result = this.#result;
    this.#clear();

    const loading = config.loading ?? false;
    const error = config.error ?? null;
    const empty = !loading && !error && result.value === null;
    const classes = [
      "numviz-root",
      "numviz-metric",
      `numviz-metric--${config.variant ?? "default"}`
    ];
    if (loading) classes.push("numviz-metric--loading");
    if (empty) classes.push("numviz-metric--empty");
    if (config.className) classes.push(config.className);

    const root = doc.createElement("div");
    root.className = classes.join(" ");
    root.dataset.numvizRoot = "metric";
    root.dataset.numvizType = "metric";
    root.dataset.numvizVariant = config.variant ?? "default";
    root.setAttribute("role", "group");
    root.setAttribute("aria-label", config.ariaLabel ?? result.title);
    root.setAttribute("aria-busy", loading ? "true" : "false");
    if (result.value !== null) root.dataset.state = result.state;
    if (config.color) root.style.setProperty("--nv-metric-accent", config.color);
    applyThemeTokens(root, this.#tokens());

    const header = doc.createElement("div");
    header.className = "numviz-metric__header";
    if (config.icon !== undefined) {
      const icon = doc.createElement("span");
      icon.className = "numviz-metric__icon";
      if (typeof config.icon === "string") {
        icon.textContent = config.icon;
        icon.setAttribute("aria-hidden", "true");
      } else if (isDomNode(config.icon)) {
        icon.appendChild(config.icon);
      }
      header.appendChild(icon);
    }
    const title = doc.createElement("span");
    title.className = "numviz-metric__title";
    title.textContent = result.title;
    header.appendChild(title);
    root.appendChild(header);

    const valueRow = doc.createElement("div");
    valueRow.className = "numviz-metric__value-row";
    if (loading) {
      const value = doc.createElement("span");
      value.className = "numviz-metric__value";
      value.textContent = "Loading…";
      valueRow.appendChild(value);
    } else if (empty) {
      const value = doc.createElement("span");
      value.className = "numviz-metric__empty";
      value.textContent = config.emptyMessage ?? "No data";
      valueRow.appendChild(value);
    } else {
      if (result.prefix) {
        const prefix = doc.createElement("span");
        prefix.className = "numviz-metric__prefix";
        prefix.textContent = result.prefix;
        valueRow.appendChild(prefix);
      }
      const value = doc.createElement("span");
      value.className = "numviz-metric__value";
      value.setAttribute("aria-live", "polite");
      value.setAttribute("aria-atomic", "true");
      value.textContent = result.formattedValue || "—";
      valueRow.appendChild(value);
      if (result.suffix) {
        const suffix = doc.createElement("span");
        suffix.className = "numviz-metric__suffix";
        suffix.textContent = result.suffix;
        valueRow.appendChild(suffix);
      }
    }
    root.appendChild(valueRow);

    if (result.description) {
      const description = doc.createElement("p");
      description.className = "numviz-metric__description";
      description.textContent = result.description;
      root.appendChild(description);
    }

    if (!loading && !error && !empty && result.comparison !== null && result.comparison.value !== null) {
      root.appendChild(this.#buildComparison(doc, result.comparison, result));
    }

    if (error) {
      const message = doc.createElement("p");
      message.className = "numviz-metric__error";
      message.setAttribute("role", "alert");
      message.textContent = error;
      root.appendChild(message);
    }

    container.appendChild(root);
    this.#root = root;
  }

  #buildComparison(
    doc: Document,
    comparison: MetricComparisonResult,
    result: MetricResult
  ): HTMLElement {
    const container = doc.createElement("div");
    container.className = "numviz-metric__comparison";
    container.dataset.state = result.state;
    if (result.trend) {
      const trend = doc.createElement("span");
      trend.className = "numviz-metric__trend";
      trend.textContent = TREND_GLYPHS[result.trend];
      trend.setAttribute("aria-hidden", "true");
      container.appendChild(trend);
    }
    const changeText =
      comparison.percentageChange !== null
        ? formatPercentageChange(
            comparison.percentageChange,
            this.#resolved.config.locale ?? "en-US"
          )
        : comparison.formattedDifference;
    if (changeText) {
      const change = doc.createElement("span");
      change.className = "numviz-metric__change";
      change.textContent = changeText;
      container.appendChild(change);
    }
    const label = doc.createElement("span");
    label.className = "numviz-metric__comparison-label";
    label.textContent = comparison.label;
    container.appendChild(label);
    if (comparison.formattedValue) {
      const value = doc.createElement("span");
      value.className = "numviz-metric__comparison-value";
      value.textContent = comparison.formattedValue;
      container.appendChild(value);
    }
    return container;
  }
}

/** Create a metric and compute its value immediately, without rendering. */
export function createMetric(config: MetricConfig): Metric {
  return new NumvizMetric(config);
}
