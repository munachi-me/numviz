import type { ResolvedAxis, ResolvedChartConfig, TickValue } from "../../types.js";
import { svgElement } from "../../utils/dom.js";
import { formatCategory, formatNumber } from "../../utils/format.js";
import { truncateLabel, type LinearScale } from "../../utils/scales.js";
import { chartSummary } from "../../utils/summary.js";
import type { Box, RenderContext } from "../context.js";

export interface ChartSvg {
  readonly svg: SVGSVGElement;
  readonly width: number;
  readonly height: number;
}

export function createChartSvg(ctx: RenderContext): ChartSvg {
  const { config, doc } = ctx;
  const label = config.ariaLabel ?? config.title ?? `Numviz ${config.type} chart`;
  const svg = svgElement(doc, "svg", {
    viewBox: `0 0 ${config.width} ${config.height}`,
    width: config.width,
    height: config.height,
    role: "img",
    "aria-label": label,
    class: "numviz-chart__svg",
    preserveAspectRatio: "xMidYMid meet",
    "data-numviz-part": "chart"
  });
  svg.appendChild(svgElement(doc, "title", {}, label));
  svg.appendChild(svgElement(doc, "desc", {}, chartSummary(config, ctx.data)));
  ctx.root.appendChild(svg);
  return { svg, width: config.width, height: config.height };
}

/** Draw the title and subtitle block and return the vertical space it consumed. */
export function drawHeader(ctx: RenderContext, svg: SVGSVGElement): number {
  const { config } = ctx;
  let consumed = 0;
  let baseline = config.margin.top;
  if (config.title) {
    baseline += 16;
    svg.appendChild(
      svgElement(
        ctx.doc,
        "text",
        {
          x: config.margin.left,
          y: baseline,
          class: "numviz-chart__title",
          "data-numviz-part": "title"
        },
        config.title
      )
    );
    consumed += 26;
  }
  if (config.subtitle) {
    baseline += config.title ? 18 : 14;
    svg.appendChild(
      svgElement(
        ctx.doc,
        "text",
        {
          x: config.margin.left,
          y: baseline,
          class: "numviz-chart__subtitle",
          "data-numviz-part": "subtitle"
        },
        config.subtitle
      )
    );
    consumed += 18;
  }
  return consumed;
}

export interface LegendItem {
  readonly index: number;
  readonly label: string;
  readonly color: string;
  readonly active: boolean;
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
  return 16 + textWidth(item.label);
}

interface LegendPlan {
  readonly rows: readonly LegendItem[][];
  readonly width: number;
  readonly height: number;
}

function planLegend(
  items: readonly LegendItem[],
  availableWidth: number,
  vertical: boolean
): LegendPlan {
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

/** Reserve layout space for a legend without drawing it. */
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
  const { config, data, hiddenSeries } = ctx;
  if (config.type === "pie" || config.type === "doughnut") {
    return data.rows
      .map((row, index) => {
        const value = row.values[config.y];
        if (typeof value !== "number" || value <= 0) return null;
        return {
          index,
          label: formatCategory(row.values[config.x]),
          color: config.palette[index % config.palette.length] as string,
          active: !hiddenSeries.has(index)
        };
      })
      .filter((item): item is LegendItem => item !== null);
  }
  return config.series.map((series) => ({
    index: series.index,
    label: series.label,
    color: series.color,
    active: !hiddenSeries.has(series.index)
  }));
}

/** Draw the reserved legend and wire interactive toggles. */
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
    vertical ? space.left || space.right : config.width - config.margin.left - config.margin.right,
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
      const itemGroup = svgElement(ctx.doc, "g", {
        class: "numviz-legend__item",
        "data-numviz-part": "legend-item",
        "data-index": item.index,
        "aria-pressed": item.active ? "true" : "false",
        opacity: item.active ? 1 : 0.4
      });
      itemGroup.appendChild(
        svgElement(ctx.doc, "rect", {
          x,
          y: y - 4,
          width: 10,
          height: 10,
          rx: 3,
          fill: item.color
        })
      );
      itemGroup.appendChild(
        svgElement(
          ctx.doc,
          "text",
          { x: x + 16, y: y + 4.5, class: "numviz-chart__tick-label" },
          item.label
        )
      );
      if (config.legend.interactive) {
        itemGroup.setAttribute("role", "button");
        itemGroup.setAttribute("tabindex", "0");
        itemGroup.setAttribute("aria-label", `${item.label}: toggle visibility`);
        const toggle = (event: Event): void => {
          event.preventDefault();
          ctx.toggleSeries(item.index);
        };
        const keydown = (event: KeyboardEvent): void => {
          if (event.key === "Enter" || event.key === " ") toggle(event);
        };
        itemGroup.addEventListener("click", toggle);
        itemGroup.addEventListener("keydown", keydown);
        ctx.onCleanup(() => {
          itemGroup.removeEventListener("click", toggle);
          itemGroup.removeEventListener("keydown", keydown);
        });
      }
      group.appendChild(itemGroup);
      x += itemWidth(item) + LEGEND_ITEM_GAP;
    }
  });

  svg.appendChild(group);
}

function tickText(axis: ResolvedAxis, value: TickValue, fallback: string): string {
  if (axis.tickFormat) return String(axis.tickFormat(value));
  return fallback;
}

function drawTickLabel(
  ctx: RenderContext,
  group: SVGGElement,
  axis: ResolvedAxis,
  x: number,
  y: number,
  text: string,
  anchor: "start" | "middle" | "end"
): void {
  const attributes: Record<string, string | number> = {
    x,
    y,
    "text-anchor": anchor,
    class: "numviz-chart__tick-label"
  };
  if (axis.rotate !== 0) {
    attributes.transform = `rotate(${-axis.rotate} ${x} ${y})`;
    attributes["text-anchor"] = axis.rotate > 0 ? "end" : "start";
  }
  group.appendChild(svgElement(ctx.doc, "text", attributes, text));
}

/** Draw a numeric axis with optional grid lines, formatting and rotation. */
export function drawNumericAxis(
  ctx: RenderContext,
  svg: SVGSVGElement,
  plot: Box,
  scale: LinearScale,
  axis: ResolvedAxis,
  orientation: "left" | "bottom",
  defaultFormat: (value: number) => string = formatNumber
): void {
  if (!axis.show) return;
  const group = svgElement(ctx.doc, "g", {
    "data-numviz-part": orientation === "left" ? "y-axis" : "x-axis"
  });
  for (const tick of scale.ticks) {
    const text = tickText(axis, tick, defaultFormat(tick));
    if (orientation === "left") {
      const y = scale.scale(tick);
      if (axis.grid) {
        group.appendChild(
          svgElement(ctx.doc, "line", {
            x1: plot.x,
            y1: y,
            x2: plot.right,
            y2: y,
            class: "numviz-chart__grid-line"
          })
        );
      }
      drawTickLabel(ctx, group, axis, plot.x - 10, y + 4, text, "end");
    } else {
      const x = scale.scale(tick);
      if (axis.grid) {
        group.appendChild(
          svgElement(ctx.doc, "line", {
            x1: x,
            y1: plot.y,
            x2: x,
            y2: plot.bottom,
            class: "numviz-chart__grid-line"
          })
        );
      }
      drawTickLabel(ctx, group, axis, x, plot.bottom + 18, text, "middle");
    }
  }

  group.appendChild(
    svgElement(ctx.doc, "line", {
      x1: plot.x,
      y1: plot.y,
      x2: plot.x,
      y2: plot.bottom,
      class: "numviz-chart__axis-line"
    })
  );
  group.appendChild(
    svgElement(ctx.doc, "line", {
      x1: plot.x,
      y1: plot.bottom,
      x2: plot.right,
      y2: plot.bottom,
      class: "numviz-chart__axis-line"
    })
  );
  svg.appendChild(group);
}

export interface CategoryAxisOptions {
  readonly labels: readonly string[];
  readonly positions: readonly number[];
  readonly cellWidth: number;
  readonly axis: ResolvedAxis;
  readonly orientation: "bottom" | "left";
}

/** Draw category tick labels with spacing-aware truncation and rotation. */
export function drawCategoryAxis(
  ctx: RenderContext,
  svg: SVGSVGElement,
  plot: Box,
  options: CategoryAxisOptions
): void {
  const { labels, positions, cellWidth, axis, orientation } = options;
  if (!axis.show || labels.length === 0) return;
  const group = svgElement(ctx.doc, "g", {
    "data-numviz-part": orientation === "bottom" ? "x-axis" : "y-axis"
  });

  if (orientation === "bottom") {
    const maxChars = Math.max(3, Math.floor(cellWidth / (11 * 0.58)));
    const longest = labels.reduce((max, label) => Math.max(max, label.length), 0);
    const skip = Math.max(1, Math.ceil((longest * 11 * 0.58 + 14) / Math.max(1, cellWidth)));
    labels.forEach((label, index) => {
      if (axis.rotate === 0 && index % skip !== 0) return;
      const x = positions[index];
      if (x === undefined) return;
      drawTickLabel(
        ctx,
        group,
        axis,
        x,
        plot.bottom + 18,
        tickText(axis, label, truncateLabel(label, axis.rotate === 0 ? maxChars : 40)),
        "middle"
      );
    });
  } else {
    const maxChars = Math.max(3, Math.floor((plot.width * 0.32) / (11 * 0.58)));
    labels.forEach((label, index) => {
      const y = positions[index];
      if (y === undefined) return;
      drawTickLabel(
        ctx,
        group,
        axis,
        plot.x - 10,
        y + 4,
        tickText(axis, label, truncateLabel(label, maxChars)),
        "end"
      );
    });
  }

  svg.appendChild(group);
}

/** Draw axis titles in the chart margins. */
export function drawAxisTitles(ctx: RenderContext, svg: SVGSVGElement, plot: Box): void {
  const { xAxis, yAxis } = ctx.config;
  if (yAxis.title) {
    svg.appendChild(
      svgElement(
        ctx.doc,
        "text",
        {
          x: 14,
          y: plot.y + plot.height / 2,
          "text-anchor": "middle",
          class: "numviz-chart__axis-title",
          "data-numviz-part": "y-axis-title",
          transform: `rotate(-90 14 ${plot.y + plot.height / 2})`
        },
        yAxis.title
      )
    );
  }
  if (xAxis.title) {
    svg.appendChild(
      svgElement(
        ctx.doc,
        "text",
        {
          x: plot.x + plot.width / 2,
          y: ctx.config.height - 6,
          "text-anchor": "middle",
          class: "numviz-chart__axis-title",
          "data-numviz-part": "x-axis-title"
        },
        xAxis.title
      )
    );
  }
}

/** Build the plot box from margins, header, legend and axis-title reservations. */
export function resolvePlot(
  config: ResolvedChartConfig,
  headerHeight: number,
  legend: LegendSpace
): Box {
  const extraLeft = config.yAxis.title ? 18 : 0;
  const extraBottom = (config.xAxis.title ? 16 : 0) + (config.xAxis.rotate !== 0 ? 12 : 0);
  const x = config.margin.left + legend.left + extraLeft;
  const y = config.margin.top + headerHeight + legend.top;
  const width = Math.max(
    1,
    config.width - config.margin.left - config.margin.right - legend.left - legend.right - extraLeft
  );
  const height = Math.max(
    1,
    config.height -
      config.margin.top -
      config.margin.bottom -
      headerHeight -
      legend.top -
      legend.bottom -
      extraBottom
  );
  return { x, y, width, height, right: x + width, bottom: y + height };
}
