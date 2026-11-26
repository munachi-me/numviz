import type { ResolvedChartConfig, NormalizedValue } from "../../types.js";
import { svgElement } from "../../utils/dom.js";
import { formatCategory, formatNumber } from "../../utils/format.js";
import { truncateLabel } from "../../utils/scales.js";
import type { Box, RenderContext } from "../context.js";

export interface ChartSvg {
  readonly svg: SVGSVGElement;
  readonly width: number;
  readonly height: number;
}

export function createChartSvg(ctx: RenderContext): ChartSvg {
  const { config, doc } = ctx;
  const width = config.width;
  const height = config.height;
  const label = config.ariaLabel ?? config.title ?? `Numviz ${config.type} chart`;
  const svg = svgElement(doc, "svg", {
    viewBox: `0 0 ${width} ${height}`,
    width,
    height,
    role: "img",
    "aria-label": label,
    class: "numviz-chart__svg",
    preserveAspectRatio: "xMidYMid meet"
  });
  svg.appendChild(svgElement(doc, "title", {}, label));
  svg.appendChild(
    svgElement(doc, "desc", {}, `A ${config.type} chart of ${config.y} by ${config.x}.`)
  );
  ctx.root.appendChild(svg);
  return { svg, width, height };
}

/** Draw the title and subtitle block and return the vertical space it consumed. */
export function drawHeader(ctx: RenderContext, svg: SVGSVGElement): number {
  const { config } = ctx;
  let consumed = 0;
  let baseline = config.margin.top;
  if (config.title) {
    baseline += 16;
    const title = svgElement(
      ctx.doc,
      "text",
      {
        x: config.margin.left,
        y: baseline,
        class: "numviz-chart__title",
        "data-numviz-part": "title"
      },
      config.title
    );
    svg.appendChild(title);
    consumed += 26;
  }
  if (config.subtitle) {
    baseline += config.title ? 18 : 14;
    const subtitle = svgElement(
      ctx.doc,
      "text",
      {
        x: config.margin.left,
        y: baseline,
        class: "numviz-chart__subtitle",
        "data-numviz-part": "subtitle"
      },
      config.subtitle
    );
    svg.appendChild(subtitle);
    consumed += 18;
  }
  return consumed;
}

export interface LegendItem {
  readonly label: string;
  readonly color: string;
}

export interface LegendSpace {
  readonly top: number;
  readonly bottom: number;
  readonly left: number;
  readonly right: number;
}

const LEGEND_FONT_SIZE = 11.5;
const LEGEND_ITEM_GAP = 16;
const LEGEND_ROW_HEIGHT = 20;

function textWidth(text: string): number {
  return text.length * LEGEND_FONT_SIZE * 0.58;
}

function itemWidth(item: LegendItem): number {
  return 10 + 6 + textWidth(item.label);
}

interface LegendPlan {
  readonly rows: readonly LegendItem[][];
  readonly width: number;
  readonly height: number;
}

function planLegend(items: readonly LegendItem[], availableWidth: number, vertical: boolean): LegendPlan {
  if (items.length === 0) return { rows: [], width: 0, height: 0 };
  if (vertical) {
    return {
      rows: items.map((item) => [item]),
      width: Math.max(...items.map(itemWidth)),
      height: items.length * LEGEND_ROW_HEIGHT
    };
  }
  const rows: LegendItem[][] = [];
  let current: LegendItem[] = [];
  let currentWidth = 0;
  let maxWidth = 0;
  for (const item of items) {
    const width = itemWidth(item);
    if (current.length > 0 && currentWidth + LEGEND_ITEM_GAP + width > availableWidth) {
      rows.push(current);
      maxWidth = Math.max(maxWidth, currentWidth);
      current = [item];
      currentWidth = width;
    } else {
      currentWidth += current.length > 0 ? LEGEND_ITEM_GAP + width : width;
      current.push(item);
    }
  }
  if (current.length > 0) {
    rows.push(current);
    maxWidth = Math.max(maxWidth, currentWidth);
  }
  return { rows, width: maxWidth, height: rows.length * LEGEND_ROW_HEIGHT };
}

/**
 * Reserve layout space for a legend without drawing it.
 * The legend is drawn later so it can sit above or below the plot.
 */
export function reserveLegend(ctx: RenderContext): LegendSpace {
  const { config } = ctx;
  if (!config.legend.show) return { top: 0, bottom: 0, left: 0, right: 0 };
  const items = legendItems(ctx);
  if (items.length === 0) return { top: 0, bottom: 0, left: 0, right: 0 };
  const position = config.legend.position;
  const vertical = position === "left" || position === "right";
  const plan = planLegend(items, config.width - config.margin.left - config.margin.right, vertical);
  if (position === "top") return { top: plan.height + 8, bottom: 0, left: 0, right: 0 };
  if (position === "bottom") return { top: 0, bottom: plan.height + 8, left: 0, right: 0 };
  const width = Math.min(Math.ceil(plan.width) + 18, config.width * 0.4);
  return position === "left"
    ? { top: 0, bottom: 0, left: width, right: 0 }
    : { top: 0, bottom: 0, left: 0, right: width };
}

export function legendItems(ctx: RenderContext): LegendItem[] {
  const { config, data } = ctx;
  if (config.type === "pie" || config.type === "doughnut") {
    return data.rows
      .map((row, index) => {
        const value = row.values[config.y];
        if (typeof value !== "number" || value <= 0) return null;
        return {
          label: formatCategory(row.values[config.x] as NormalizedValue),
          color: config.palette[index % config.palette.length] as string
        };
      })
      .filter((item): item is LegendItem => item !== null);
  }
  return [{ label: columnLabel(ctx, config.y), color: config.palette[0] as string }];
}

function columnLabel(ctx: RenderContext, field: string): string {
  return ctx.data.columns.find((column) => column.key === field)?.label ?? field;
}

/** Draw the reserved legend and return its bounds, or undefined when not drawn. */
export function drawLegend(
  ctx: RenderContext,
  svg: SVGSVGElement,
  space: LegendSpace,
  plot: Box,
  headerHeight: number
): void {
  const { config } = ctx;
  if (!config.legend.show) return;
  const items = legendItems(ctx);
  if (items.length === 0) return;
  const position = config.legend.position;
  const vertical = position === "left" || position === "right";
  const plan = planLegend(
    items,
    position === "left" || position === "right" ? space.left || space.right : config.width - config.margin.left - config.margin.right,
    vertical
  );

  let originX: number;
  let originY: number;
  if (position === "top") {
    originX = config.margin.left;
    originY = config.margin.top + headerHeight + 12;
  } else if (position === "bottom") {
    originX = config.margin.left;
    originY = config.height - config.margin.bottom - space.bottom + 8;
  } else if (position === "left") {
    originX = config.margin.left;
    originY = plot.y + 4;
  } else {
    originX = plot.right + 16;
    originY = plot.y + 4;
  }

  const group = svgElement(ctx.doc, "g", {
    class: "numviz-legend",
    "data-numviz-part": "legend",
    role: "list"
  });

  plan.rows.forEach((row, rowIndex) => {
    let x = originX;
    const y = originY + rowIndex * LEGEND_ROW_HEIGHT;
    for (const item of row) {
      group.appendChild(
        svgElement(ctx.doc, "rect", {
          x,
          y: y - 4,
          width: 10,
          height: 10,
          rx: 3,
          fill: item.color
        })
      );
      group.appendChild(
        svgElement(
          ctx.doc,
          "text",
          {
            x: x + 16,
            y: y + 4.5,
            class: "numviz-chart__tick-label"
          },
          item.label
        )
      );
      x += itemWidth(item) + LEGEND_ITEM_GAP;
    }
  });

  svg.appendChild(group);
}

export function drawYAxis(
  ctx: RenderContext,
  svg: SVGSVGElement,
  plot: Box,
  scale: { readonly ticks: readonly number[]; readonly scale: (value: number) => number }
): void {
  const ticksGroup = svgElement(ctx.doc, "g", { "data-numviz-part": "y-axis" });
  for (const tick of scale.ticks) {
    const y = scale.scale(tick);
    ticksGroup.appendChild(
      svgElement(ctx.doc, "line", {
        x1: plot.x,
        y1: y,
        x2: plot.right,
        y2: y,
        class: "numviz-chart__grid-line"
      })
    );
    ticksGroup.appendChild(
      svgElement(
        ctx.doc,
        "text",
        {
          x: plot.x - 10,
          y: y + 4,
          "text-anchor": "end",
          class: "numviz-chart__tick-label"
        },
        formatNumber(tick)
      )
    );
  }
  ticksGroup.appendChild(
    svgElement(ctx.doc, "line", {
      x1: plot.x,
      y1: plot.y,
      x2: plot.x,
      y2: plot.bottom,
      class: "numviz-chart__axis-line"
    })
  );
  ticksGroup.appendChild(
    svgElement(ctx.doc, "line", {
      x1: plot.x,
      y1: plot.bottom,
      x2: plot.right,
      y2: plot.bottom,
      class: "numviz-chart__axis-line"
    })
  );
  svg.appendChild(ticksGroup);
}

export function drawXLabels(
  ctx: RenderContext,
  svg: SVGSVGElement,
  plot: Box,
  labels: readonly string[],
  positions: readonly number[],
  cellWidth: number
): void {
  if (labels.length === 0) return;
  const group = svgElement(ctx.doc, "g", { "data-numviz-part": "x-axis" });
  const maxChars = Math.max(3, Math.floor(cellWidth / (11 * 0.58)));
  const longest = labels.reduce((max, label) => Math.max(max, label.length), 0);
  const needed = Math.min(cellWidth, longest * 11 * 0.58 + 14);
  const skip = Math.max(1, Math.ceil(needed / Math.max(1, cellWidth)));
  labels.forEach((label, index) => {
    if (index % skip !== 0) return;
    const x = positions[index];
    if (x === undefined) return;
    group.appendChild(
      svgElement(
        ctx.doc,
        "text",
        {
          x,
          y: plot.bottom + 18,
          "text-anchor": "middle",
          class: "numviz-chart__tick-label"
        },
        truncateLabel(label, maxChars)
      )
    );
  });
  svg.appendChild(group);
}

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

/** Make an SVG mark focusable and show a tooltip on hover, focus and touch. */
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

  const pointFromEvent = (event: Event): { x: number; y: number } => {
    const bounds = ctx.root.getBoundingClientRect();
    if (event instanceof MouseEvent && (event.clientX !== 0 || event.clientY !== 0)) {
      return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
    }
    const box = mark.getBoundingClientRect();
    return { x: box.left - bounds.left + box.width / 2, y: box.top - bounds.top };
  };

  const show = (event: Event): void => {
    const point = pointFromEvent(event);
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

/** Build the plot box from margins, header and legend reservations. */
export function resolvePlot(
  config: ResolvedChartConfig,
  headerHeight: number,
  legend: LegendSpace
): Box {
  const x = config.margin.left + legend.left;
  const y = config.margin.top + headerHeight + legend.top;
  const width = Math.max(1, config.width - config.margin.left - config.margin.right - legend.left - legend.right);
  const height = Math.max(
    1,
    config.height - config.margin.top - config.margin.bottom - headerHeight - legend.top - legend.bottom
  );
  return { x, y, width, height, right: x + width, bottom: y + height };
}
