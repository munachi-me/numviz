import type { TooltipContext } from "../../types.js";
import { svgElement } from "../../utils/dom.js";
import { formatNumber } from "../../utils/format.js";
import type { Box, RenderContext } from "../context.js";

export interface TooltipHandle {
  show(label: string, value: string, x: number, y: number): void;
  hide(): void;
}

export function createTooltip(ctx: RenderContext): TooltipHandle {
  const element = ctx.doc.createElement("div");
  element.className = "numviz-tooltip";
  element.setAttribute("role", "status");
  element.setAttribute("aria-live", "polite");
  element.dataset.visible = "false";
  ctx.root.appendChild(element);

  const labelEl = ctx.doc.createElement("span");
  labelEl.className = "numviz-tooltip__label";
  const valueEl = ctx.doc.createElement("span");
  valueEl.className = "numviz-tooltip__value";
  element.append(labelEl, valueEl);

  return {
    show(label, value, x, y) {
      labelEl.textContent = label;
      valueEl.textContent = value;
      element.dataset.visible = "true";
      const boundsWidth = ctx.root.clientWidth || ctx.config.width;
      const boundsHeight = ctx.root.clientHeight || ctx.config.height;
      const width = 150;
      const left = x + 16 + width > boundsWidth ? Math.max(8, x - width - 8) : x + 16;
      const top = Math.max(8, Math.min(y - 12, boundsHeight - 56));
      element.style.transform = `translate3d(${Math.round(left)}px, ${Math.round(top)}px, 0)`;
    },
    hide() {
      element.dataset.visible = "false";
    }
  };
}

function markPoint(ctx: RenderContext, mark: SVGElement, event: Event): { x: number; y: number } {
  const bounds = ctx.root.getBoundingClientRect();
  if (event instanceof MouseEvent && (event.clientX !== 0 || event.clientY !== 0)) {
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  }
  const box = mark.getBoundingClientRect();
  return { x: box.left - bounds.left + box.width / 2, y: box.top - bounds.top };
}

/** Make an SVG mark focusable and show a tooltip on hover, focus and touch. */
/** Format a tooltip value with the configured formatter, or a default. */
export function formatTooltipValue(
  ctx: RenderContext,
  value: number,
  context: TooltipContext
): string {
  return ctx.config.tooltip.formatter
    ? ctx.config.tooltip.formatter(value, context)
    : formatNumber(value);
}

export function attachTooltip(
  ctx: RenderContext,
  mark: SVGElement,
  tooltip: TooltipHandle,
  label: string,
  value: string
): void {
  if (!ctx.config.tooltip.show) return;
  mark.setAttribute("tabindex", "0");
  mark.setAttribute("aria-label", `${label}: ${value}`);

  const show = (event: Event): void => {
    const point = markPoint(ctx, mark, event);
    tooltip.show(label, value, point.x, point.y);
  };
  const hide = (): void => tooltip.hide();

  mark.addEventListener("pointerenter", show);
  mark.addEventListener("pointermove", show);
  mark.addEventListener("pointerleave", hide);
  mark.addEventListener("focus", show);
  mark.addEventListener("blur", hide);
  ctx.onCleanup(() => {
    mark.removeEventListener("pointerenter", show);
    mark.removeEventListener("pointermove", show);
    mark.removeEventListener("pointerleave", hide);
    mark.removeEventListener("focus", show);
    mark.removeEventListener("blur", hide);
  });
}

/** Dim other categories, or other series, while a mark is hovered or focused. */
export function attachHighlight(
  ctx: RenderContext,
  mark: SVGElement,
  mode: "category" | "series" = "category"
): void {
  const index = mark.getAttribute("data-index");
  const series = mark.getAttribute("data-series");
  if (index === null) return;

  const dim = (): void => {
    const svg = mark.ownerSVGElement;
    if (!svg) return;
    svg.querySelectorAll<SVGElement>(".numviz-chart__mark").forEach((other) => {
      if (other === mark) return;
      const sameGroup =
        mode === "category"
          ? other.getAttribute("data-index") === index
          : other.getAttribute("data-series") === series;
      if (!sameGroup) other.classList.add("numviz-chart__mark--dimmed");
    });
  };
  const restore = (): void => {
    mark.ownerSVGElement?.querySelectorAll(".numviz-chart__mark--dimmed").forEach((other) => {
      other.classList.remove("numviz-chart__mark--dimmed");
    });
  };

  mark.addEventListener("pointerenter", dim);
  mark.addEventListener("pointerleave", restore);
  mark.addEventListener("focus", dim);
  mark.addEventListener("blur", restore);
  ctx.onCleanup(() => {
    mark.removeEventListener("pointerenter", dim);
    mark.removeEventListener("pointerleave", restore);
    mark.removeEventListener("focus", dim);
    mark.removeEventListener("blur", restore);
  });
}

export interface InteractionPayload {
  readonly label: string;
  readonly field: string;
  readonly series?: string;
  readonly value: number | null;
  readonly index: number;
}

/** Wire click and keyboard activation to the configured `onClick` handler. */
export function attachInteraction(
  ctx: RenderContext,
  mark: SVGElement,
  payload: InteractionPayload
): void {
  const handler = ctx.config.onClick;
  if (!handler) return;
  if (!mark.hasAttribute("tabindex")) mark.setAttribute("tabindex", "0");
  mark.setAttribute("role", "button");
  const fire = (event: Event): void => {
    handler({ type: ctx.config.type, ...payload, originalEvent: event });
  };
  const keydown = (event: KeyboardEvent): void => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      fire(event);
    }
  };
  mark.addEventListener("click", fire);
  mark.addEventListener("keydown", keydown);
  ctx.onCleanup(() => {
    mark.removeEventListener("click", fire);
    mark.removeEventListener("keydown", keydown);
  });
}

export function renderEmptyState(
  ctx: RenderContext,
  svg: SVGSVGElement,
  plot: Box,
  message = "No data to display"
): void {
  svg.appendChild(
    svgElement(
      ctx.doc,
      "text",
      {
        x: plot.x + plot.width / 2,
        y: plot.y + plot.height / 2,
        "text-anchor": "middle",
        class: "numviz-chart__tick-label",
        "data-numviz-part": "empty"
      },
      message
    )
  );
}
