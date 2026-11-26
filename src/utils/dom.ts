import { NumvizError } from "../errors.js";
import type { ThemeTokens } from "../types.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const STYLE_ID = "numviz-base-styles";

export function getDocument(): Document {
  const doc = globalThis.document;
  if (!doc) {
    throw new NumvizError(
      "Numviz requires a DOM to render into. Use Numviz in a browser or provide a jsdom-like document.",
      { code: "NO_DOM" }
    );
  }
  return doc;
}

/** Resolve a CSS selector or DOM element to an element. */
export function resolveContainer(target: string | Element): Element {
  if (typeof target !== "string") {
    if (target && typeof target === "object" && "nodeType" in target && target.nodeType === 1) {
      return target;
    }
    throw new NumvizError("Chart target must be a CSS selector string or a DOM element.", {
      code: "INVALID_CONTAINER",
      details: { received: typeof target }
    });
  }

  if (target.trim().length === 0) {
    throw new NumvizError("Chart target selector must not be empty.", { code: "INVALID_CONTAINER" });
  }

  const doc = getDocument();
  const found = doc.querySelector(target);
  if (!found) {
    throw new NumvizError(`No element matches the chart target selector "${target}".`, {
      code: "CONTAINER_NOT_FOUND",
      details: { selector: target }
    });
  }
  return found;
}

const BASE_CSS = `
.numviz-root {
  position: relative;
  display: block;
  box-sizing: border-box;
  width: 100%;
  font-family: var(--nv-font-family);
  color: var(--nv-text);
  background: var(--nv-background);
  border-radius: var(--nv-radius);
  overflow: hidden;
}
.numviz-root *,
.numviz-root *::before,
.numviz-root *::after { box-sizing: border-box; }
.numviz-chart__svg {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}
.numviz-chart__title {
  font-size: 16px;
  font-weight: 600;
  fill: var(--nv-text);
}
.numviz-chart__subtitle { font-size: 12px; fill: var(--nv-muted-text); }
.numviz-chart__axis-line { stroke: var(--nv-border); stroke-width: 1; }
.numviz-chart__grid-line { stroke: var(--nv-grid); stroke-width: 1; }
.numviz-chart__tick-label { font-size: 11px; fill: var(--nv-muted-text); }
.numviz-chart__axis-title { font-size: 11px; font-weight: 600; fill: var(--nv-muted-text); }
.numviz-chart__value-label { font-size: 11px; font-weight: 600; fill: var(--nv-text); }
.numviz-chart__mark {
  cursor: default;
  animation: numviz-fade-in var(--nv-animation-duration, 240ms) ease-out both;
  transition: opacity 120ms ease, filter 120ms ease;
}
@keyframes numviz-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
[data-nv-animation="off"] .numviz-chart__mark { animation: none; }
.numviz-chart__mark:hover,
.numviz-chart__mark:focus-visible { filter: brightness(1.08); }
.numviz-chart__mark:focus-visible { outline: 2px solid var(--nv-accent); outline-offset: 2px; }
.numviz-chart__mark--dimmed { opacity: 0.35; }
.numviz-chart__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 160px;
  color: var(--nv-muted-text);
  font-size: 13px;
  background: var(--nv-background);
}
.numviz-chart__empty-text { margin: 0; }
.numviz-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  align-items: center;
  font-size: 12px;
  color: var(--nv-muted-text);
}
.numviz-legend__item { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; }
.numviz-legend__item:focus-visible { outline: 2px solid var(--nv-accent); outline-offset: 2px; }
.numviz-legend__swatch {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  flex: 0 0 auto;
}
.numviz-tooltip {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 2;
  max-width: 240px;
  padding: 8px 10px;
  border: 1px solid var(--nv-border);
  border-radius: 8px;
  background: var(--nv-surface-elevated);
  color: var(--nv-text);
  box-shadow: 0 8px 20px rgb(15 23 42 / 12%);
  font-size: 12px;
  line-height: 1.45;
  pointer-events: none;
  opacity: 0;
  transform: translate3d(0, 0, 0);
  transition: opacity 120ms ease;
}
.numviz-tooltip[data-visible="true"] { opacity: 1; }
.numviz-tooltip__label { display: block; font-weight: 600; margin-bottom: 2px; }
.numviz-tooltip__value { color: var(--nv-muted-text); }
@media (prefers-reduced-motion: reduce) {
  .numviz-chart__mark {
    animation: none;
    transition: none;
  }
  .numviz-tooltip { transition: none; }
}
`;

export function ensureBaseStyles(doc: Document): void {
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = BASE_CSS;
  const head = doc.head ?? doc.documentElement;
  head.prepend(style);
}

export function applyThemeTokens(element: HTMLElement, tokens: ThemeTokens): void {
  const set = (name: string, value: string | number): void => {
    element.style.setProperty(name, String(value));
  };
  set("--nv-background", tokens.background);
  set("--nv-surface", tokens.surface);
  set("--nv-surface-elevated", tokens.surfaceElevated);
  set("--nv-text", tokens.text);
  set("--nv-muted-text", tokens.mutedText);
  set("--nv-border", tokens.border);
  set("--nv-grid", tokens.grid);
  set("--nv-accent", tokens.accent);
  set("--nv-positive", tokens.positive);
  set("--nv-warning", tokens.warning);
  set("--nv-danger", tokens.danger);
  set("--nv-info", tokens.info);
  set("--nv-font-family", tokens.fontFamily);
  set("--nv-radius", `${tokens.borderRadius}px`);
}

export interface SvgAttributes {
  readonly [name: string]: string | number | undefined;
}

export function svgElement<K extends keyof SVGElementTagNameMap>(
  doc: Document,
  tag: K,
  attributes: SvgAttributes = {},
  text?: string
): SVGElementTagNameMap[K] {
  const element = doc.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attributes)) {
    if (value === undefined) continue;
    element.setAttribute(name, String(value));
  }
  if (text !== undefined) element.textContent = text;
  return element;
}

export function isElement(value: unknown): value is Element {
  return typeof value === "object" && value !== null && "nodeType" in value && (value as Element).nodeType === 1;
}
