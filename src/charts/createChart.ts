import { getDocument, applyThemeTokens, ensureBaseStyles, resolveContainer } from "../utils/dom.js";
import { NumvizError } from "../errors.js";
import { renderChartContent } from "../renderers/svg/chart.js";
import type { RenderContext } from "../renderers/context.js";
import { resolveTheme } from "../theme/tokens.js";
import type { Chart, ChartConfig, NormalizedDataset, ResolvedChartConfig, ThemeTokens } from "../types.js";
import { resolveChart } from "./config.js";

class NumvizChart implements Chart {
  readonly config: ResolvedChartConfig;
  readonly data: NormalizedDataset;

  #root: HTMLElement | null = null;
  #destroyed = false;
  #cleanups: Array<() => void> = [];

  constructor(config: ChartConfig) {
    const resolved = resolveChart(config);
    this.config = resolved.config;
    this.data = resolved.data;
  }

  get element(): HTMLElement | null {
    return this.#root;
  }

  get isDestroyed(): boolean {
    return this.#destroyed;
  }

  render(target: string | Element): Chart {
    if (this.#destroyed) {
      throw new NumvizError("This chart has been destroyed. Create a new chart to render again.", {
        code: "DESTROYED"
      });
    }

    const container = resolveContainer(target);
    const doc = getDocument();
    ensureBaseStyles(doc);
    this.#clearRendered();

    const tokens: ThemeTokens = this.config.background
      ? { ...resolveTheme(this.config.theme), background: this.config.background }
      : resolveTheme(this.config.theme);

    const root = doc.createElement("div");
    root.className = `numviz-root numviz-chart numviz-chart--${this.config.type}`;
    root.dataset.numvizRoot = "chart";
    root.dataset.numvizType = this.config.type;
    applyThemeTokens(root, tokens);

    const context: RenderContext = {
      doc,
      root,
      config: this.config,
      data: this.data,
      tokens,
      onCleanup: (cleanup) => {
        this.#cleanups.push(cleanup);
      }
    };

    renderChartContent(context);
    container.appendChild(root);
    this.#root = root;
    return this;
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
  }
}

/**
 * Create a chart instance.
 *
 * The returned chart validates and normalizes its configuration immediately and
 * renders when {@link Chart.render} is called.
 */
export function createChart(config: ChartConfig): Chart {
  return new NumvizChart(config);
}
