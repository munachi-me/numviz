import { NumvizError } from "../errors.js";
import { chartToPNG, chartToSVG } from "../export/chart.js";
import { renderChartContent } from "../renderers/svg/chart.js";
import type { RenderContext } from "../renderers/context.js";
import { resolveTheme } from "../theme/tokens.js";
import {
  applyThemeTokens,
  ensureBaseStyles,
  getDocument,
  getWindow,
  resolveContainer
} from "../utils/dom.js";
import type {
  Chart,
  ChartConfig,
  ChartExportOptions,
  ChartPNGExportOptions,
  NormalizedDataset,
  ResolvedChartConfig,
  ThemeTokens
} from "../types.js";
import { resolveChart } from "./config.js";

const MIN_WIDTH = 240;
const RESIZE_EPSILON = 4;

type ChartWindow = Window & typeof globalThis;

class NumvizChart implements Chart {
  config: ResolvedChartConfig;
  data: NormalizedDataset;

  #root: HTMLElement | null = null;
  #container: Element | null = null;
  #view: ChartWindow | undefined;
  #destroyed = false;
  #cleanups: Array<() => void> = [];
  #hidden = new Set<number>();
  #selectedIndex: number | null = null;
  #explicitWidth: boolean;
  #observer: ResizeObserver | null = null;
  #renderedWidth = 0;
  #frame = 0;

  constructor(config: ChartConfig) {
    const resolved = resolveChart(config);
    this.config = resolved.config;
    this.data = resolved.data;
    this.#explicitWidth = config.width !== undefined;
    if (config.selectedIndex !== undefined) this.#selectedIndex = config.selectedIndex;
  }

  get element(): HTMLElement | null {
    return this.#root;
  }

  get isDestroyed(): boolean {
    return this.#destroyed;
  }

  setSeriesVisible(index: number, visible: boolean): Chart {
    if (!Number.isInteger(index) || index < 0) {
      throw new NumvizError("Series index must be a non-negative integer.", {
        code: "INVALID_CONFIG",
        path: "index"
      });
    }
    if (visible) this.#hidden.delete(index);
    else this.#hidden.add(index);
    if (this.#root) this.#draw();
    return this;
  }

  setSelectedIndex(index: number | null): Chart {
    if (index !== null && (!Number.isInteger(index) || index < 0)) {
      throw new NumvizError("Selected index must be a non-negative integer or null.", {
        code: "INVALID_CONFIG",
        path: "selectedIndex"
      });
    }
    this.#selectedIndex = index;
    this.#applySelection();
    return this;
  }

  getSelectedIndex(): number | null {
    return this.#selectedIndex;
  }

  toSVG(options?: ChartExportOptions): string {
    return chartToSVG(this, options);
  }

  toPNG(options?: ChartPNGExportOptions): Promise<Blob> {
    return chartToPNG(this, options);
  }

  update(config: ChartConfig): Chart {
    if (this.#destroyed) {
      throw new NumvizError("This chart has been destroyed. Create a new chart to update it.", {
        code: "DESTROYED"
      });
    }
    const resolved = resolveChart(config);
    const container = this.#container;
    this.config = resolved.config;
    this.data = resolved.data;
    this.#explicitWidth = config.width !== undefined;
    if (config.selectedIndex !== undefined) this.#selectedIndex = config.selectedIndex;
    for (const index of this.#hidden) {
      if (index >= resolved.config.series.length) this.#hidden.delete(index);
    }
    if (!container) return this;
    this.#clearRendered();
    return this.render(container);
  }

  render(target: string | Element): Chart {
    if (this.#destroyed) {
      throw new NumvizError("This chart has been destroyed. Create a new chart to render again.", {
        code: "DESTROYED"
      });
    }

    const container = this.#resolveTarget(target);
    const doc = container.ownerDocument ?? getDocument();
    ensureBaseStyles(doc);
    this.#clearRendered();

    this.#container = container;
    this.#view = getWindow(doc);
    const tokens = this.#tokens();
    const root = doc.createElement("div");
    const classes = [
      "numviz-root",
      "numviz-chart",
      `numviz-chart--${this.config.type}`,
      ...(this.config.className ? [this.config.className] : [])
    ];
    root.className = classes.join(" ");
    root.dataset.numvizRoot = "chart";
    root.dataset.numvizType = this.config.type;
    root.dataset.nvAnimation = this.config.animation.enabled ? "on" : "off";
    root.style.setProperty("--nv-animation-duration", `${this.config.animation.duration}ms`);
    applyThemeTokens(root, tokens);
    this.#root = root;
    container.appendChild(root);

    this.#draw();
    this.#observe(container);
    return this;
  }

  destroy(): void {
    this.#clearRendered();
    this.#destroyed = true;
  }

  #resolveTarget(target: string | Element): Element {
    if (typeof target === "string") {
      const doc = getDocument();
      return resolveContainer(target, doc);
    }
    return resolveContainer(target);
  }

  #tokens(): ThemeTokens {
    const tokens = resolveTheme(this.config.theme, this.#view);
    return this.config.background ? { ...tokens, background: this.config.background } : tokens;
  }

  #widthForLayout(): number {
    if (this.#explicitWidth) return this.config.width;
    const container = this.#container as (Element & { clientWidth?: number }) | null;
    const measured =
      container && typeof container.clientWidth === "number" ? container.clientWidth : 0;
    return measured > 0 ? Math.max(MIN_WIDTH, Math.round(measured)) : this.config.width;
  }

  #draw(): void {
    const root = this.#root;
    if (!root) return;
    for (const cleanup of this.#cleanups) cleanup();
    this.#cleanups = [];
    root.replaceChildren();

    const width = this.#widthForLayout();
    this.#renderedWidth = width;
    const config: ResolvedChartConfig =
      width === this.config.width ? this.config : { ...this.config, width };

    const context: RenderContext = {
      doc: root.ownerDocument,
      root,
      config,
      data: this.data,
      tokens: this.#tokens(),
      hiddenSeries: this.#hidden,
      toggleSeries: (index) => {
        if (this.#hidden.has(index)) this.#hidden.delete(index);
        else this.#hidden.add(index);
        this.#draw();
      },
      onCleanup: (cleanup) => {
        this.#cleanups.push(cleanup);
      }
    };

    renderChartContent(context);
    this.#applySelection();
  }

  #applySelection(): void {
    const root = this.#root;
    if (!root) return;
    const index = this.#selectedIndex;
    root.querySelectorAll<SVGElement>(".numviz-chart__mark").forEach((mark) => {
      const selected = index !== null && mark.getAttribute("data-index") === String(index);
      mark.classList.toggle("numviz-chart__mark--selected", selected);
      if (selected) mark.setAttribute("aria-pressed", "true");
      else mark.removeAttribute("aria-pressed");
    });
  }

  #observe(container: Element): void {
    if (!this.config.responsive || this.#explicitWidth) return;
    const view = this.#view;
    const Observer =
      (view as (ChartWindow & { ResizeObserver?: typeof ResizeObserver }) | undefined)
        ?.ResizeObserver ?? globalThis.ResizeObserver;
    if (typeof Observer !== "function") return;

    this.#observer = new Observer(() => {
      if (!this.#root) return;
      const width = this.#widthForLayout();
      if (Math.abs(width - this.#renderedWidth) < RESIZE_EPSILON) return;
      if (this.#frame) return;
      const requestFrame = view?.requestAnimationFrame?.bind(view);
      const cancelFrame = view?.cancelAnimationFrame?.bind(view);
      const schedule =
        requestFrame ??
        ((callback: FrameRequestCallback) => setTimeout(() => callback(0), 16));
      this.#frame = schedule(() => {
        this.#frame = 0;
        this.#draw();
      }) as unknown as number;
      this.#cancelFrame = cancelFrame;
    });
    this.#observer.observe(container);
  }

  #cancelFrame: ((handle: number) => void) | undefined;

  #clearRendered(): void {
    for (const cleanup of this.#cleanups) cleanup();
    this.#cleanups = [];
    this.#observer?.disconnect();
    this.#observer = null;
    if (this.#frame) {
      if (this.#cancelFrame) this.#cancelFrame(this.#frame);
      else if (typeof globalThis.cancelAnimationFrame === "function") {
        globalThis.cancelAnimationFrame(this.#frame);
      } else {
        clearTimeout(this.#frame);
      }
      this.#frame = 0;
    }
    this.#cancelFrame = undefined;
    this.#root?.remove();
    this.#root = null;
    this.#container = null;
    this.#view = undefined;
  }
}

/**
 * Create a chart instance.
 *
 * The returned chart validates and normalizes its configuration immediately and
 * renders when {@link Chart.render} is called. Rendering uses the target
 * element's owning document and window, so charts work inside iframes.
 */
export function createChart(config: ChartConfig): Chart {
  return new NumvizChart(config);
}
