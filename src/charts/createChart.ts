import { NumvizError } from "../errors.js";
import { renderChartContent } from "../renderers/svg/chart.js";
import type { RenderContext } from "../renderers/context.js";
import { resolveTheme } from "../theme/tokens.js";
import { applyThemeTokens, ensureBaseStyles, getDocument, resolveContainer } from "../utils/dom.js";
import type {
  Chart,
  ChartConfig,
  NormalizedDataset,
  ResolvedChartConfig,
  ThemeTokens
} from "../types.js";
import { resolveChart } from "./config.js";

const MIN_WIDTH = 240;
const RESIZE_EPSILON = 4;

class NumvizChart implements Chart {
  readonly config: ResolvedChartConfig;
  readonly data: NormalizedDataset;

  #root: HTMLElement | null = null;
  #container: Element | null = null;
  #destroyed = false;
  #cleanups: Array<() => void> = [];
  #hidden = new Set<number>();
  #explicitWidth: boolean;
  #observer: ResizeObserver | null = null;
  #renderedWidth = 0;
  #frame = 0;

  constructor(config: ChartConfig) {
    const resolved = resolveChart(config);
    this.config = resolved.config;
    this.data = resolved.data;
    this.#explicitWidth = config.width !== undefined;
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

    this.#container = container;
    const tokens = this.#tokens();
    const root = doc.createElement("div");
    root.className = `numviz-root numviz-chart numviz-chart--${this.config.type}`;
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

  #tokens(): ThemeTokens {
    const tokens = resolveTheme(this.config.theme);
    return this.config.background ? { ...tokens, background: this.config.background } : tokens;
  }

  #widthForLayout(): number {
    if (this.#explicitWidth) return this.config.width;
    const container = this.#container;
    const measured =
      container instanceof HTMLElement ? container.clientWidth : 0;
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
    const config: ResolvedChartConfig = width === this.config.width ? this.config : { ...this.config, width };

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
  }

  #observe(container: Element): void {
    const Observer = globalThis.ResizeObserver;
    if (!this.config.responsive || this.#explicitWidth || typeof Observer !== "function") return;
    this.#observer = new Observer(() => {
      if (!this.#root) return;
      const width = this.#widthForLayout();
      if (Math.abs(width - this.#renderedWidth) < RESIZE_EPSILON) return;
      if (this.#frame) return;
      const schedule =
        typeof globalThis.requestAnimationFrame === "function"
          ? globalThis.requestAnimationFrame
          : (callback: FrameRequestCallback) => setTimeout(() => callback(0), 16);
      this.#frame = schedule(() => {
        this.#frame = 0;
        this.#draw();
      }) as unknown as number;
    });
    this.#observer.observe(container);
  }

  #clearRendered(): void {
    for (const cleanup of this.#cleanups) cleanup();
    this.#cleanups = [];
    this.#observer?.disconnect();
    this.#observer = null;
    if (this.#frame) {
      if (typeof globalThis.cancelAnimationFrame === "function") {
        globalThis.cancelAnimationFrame(this.#frame);
      } else {
        clearTimeout(this.#frame);
      }
      this.#frame = 0;
    }
    this.#root?.remove();
    this.#root = null;
    this.#container = null;
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
