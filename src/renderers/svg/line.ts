import type { NormalizedValue } from "../../types.js";
import { svgElement } from "../../utils/dom.js";
import { formatCategory, formatNumber } from "../../utils/format.js";
import { linearScale } from "../../utils/scales.js";
import type { RenderContext } from "../context.js";
import {
  attachTooltip,
  createChartSvg,
  createTooltip,
  drawHeader,
  drawLegend,
  drawXLabels,
  drawYAxis,
  renderEmptyState,
  reserveLegend,
  resolvePlot
} from "./common.js";

function pointPositions(count: number, start: number, end: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [start + (end - start) / 2];
  return Array.from({ length: count }, (_, index) => start + (index / (count - 1)) * (end - start));
}

export function renderLineChart(ctx: RenderContext): void {
  const { config, data } = ctx;
  const { svg } = createChartSvg(ctx);
  const headerHeight = drawHeader(ctx, svg);
  const legendSpace = reserveLegend(ctx);
  const plot = resolvePlot(config, headerHeight, legendSpace);
  drawLegend(ctx, svg, legendSpace, plot, headerHeight);

  const values = data.rows
    .map((row) => row.values[config.y])
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  if (data.empty || values.length === 0) {
    renderEmptyState(ctx, svg, plot);
    return;
  }

  const yScale = linearScale(values, plot.bottom, plot.y);
  drawYAxis(ctx, svg, plot, yScale);

  const xs = pointPositions(data.rows.length, plot.x, plot.right);
  const color = config.palette[0] as string;
  const labels = data.rows.map((row) => formatCategory(row.values[config.x] as NormalizedValue));
  const tooltip = config.tooltip.show ? createTooltip(ctx) : null;

  const segments: string[] = [];
  let openSegment = false;
  data.rows.forEach((row, index) => {
    const value = row.values[config.y];
    const x = xs[index];
    if (x === undefined) return;
    if (typeof value !== "number" || !Number.isFinite(value)) {
      openSegment = false;
      return;
    }
    const y = yScale.scale(value);
    segments.push(`${openSegment ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`);
    openSegment = true;
  });

  if (segments.length > 0) {
    svg.appendChild(
      svgElement(ctx.doc, "path", {
        d: segments.join(" "),
        fill: "none",
        stroke: color,
        "stroke-width": 2,
        "stroke-linejoin": "round",
        "stroke-linecap": "round",
        "data-numviz-part": "line"
      })
    );
  }

  const marks = svgElement(ctx.doc, "g", { "data-numviz-part": "points" });
  data.rows.forEach((row, index) => {
    const value = row.values[config.y];
    const x = xs[index];
    if (x === undefined || typeof value !== "number" || !Number.isFinite(value)) return;
    const y = yScale.scale(value);
    const label = labels[index] ?? "";
    const formatted = formatNumber(value);
    const point = svgElement(ctx.doc, "circle", {
      cx: x,
      cy: y,
      r: 4,
      fill: ctx.tokens.background,
      stroke: color,
      "stroke-width": 2,
      class: "numviz-chart__mark",
      "data-numviz-part": "point",
      "data-index": index
    });
    if (tooltip) attachTooltip(ctx, point, tooltip, label, `${columnLabel(ctx, config.y)}: ${formatted}`);
    marks.appendChild(point);

    if (config.labels.show) {
      marks.appendChild(
        svgElement(
          ctx.doc,
          "text",
          {
            x,
            y: y - 10,
            "text-anchor": "middle",
            class: "numviz-chart__value-label",
            "data-numviz-part": "value-label"
          },
          config.labels.formatter ? config.labels.formatter(value, label) : formatted
        )
      );
    }
  });
  svg.appendChild(marks);

  drawXLabels(ctx, svg, plot, labels, xs, plot.width / Math.max(1, data.rows.length));
}

function columnLabel(ctx: RenderContext, field: string): string {
  return ctx.data.columns.find((column) => column.key === field)?.label ?? field;
}
