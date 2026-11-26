import type { NormalizedValue } from "../../types.js";
import { svgElement } from "../../utils/dom.js";
import { formatCategory, formatNumber } from "../../utils/format.js";
import { bandScale, linearScale } from "../../utils/scales.js";
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

export function renderBarChart(ctx: RenderContext): void {
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

  const band = bandScale(data.rows.length, plot.x, plot.right);
  const tooltip = config.tooltip.show ? createTooltip(ctx) : null;
  const labels = data.rows.map((row) => formatCategory(row.values[config.x] as NormalizedValue));
  const positions = data.rows.map((_, index) => band.x(index) + band.bandwidth / 2);
  const color = config.palette[0] as string;
  const radius = Math.min(4, band.bandwidth / 4);
  const marks = svgElement(ctx.doc, "g", { "data-numviz-part": "bars" });

  data.rows.forEach((row, index) => {
    const value = row.values[config.y];
    if (typeof value !== "number" || !Number.isFinite(value)) return;
    const x = band.x(index);
    const y = Math.min(yScale.scale(value), plot.bottom);
    const height = Math.abs(yScale.scale(value) - yScale.scale(0));
    const bar = svgElement(ctx.doc, "rect", {
      x,
      y: value >= 0 ? y : yScale.scale(0),
      width: band.bandwidth,
      height: Math.max(1, height),
      rx: radius,
      fill: color,
      class: "numviz-chart__mark",
      "data-numviz-part": "bar",
      "data-index": index
    });
    const label = labels[index] ?? "";
    const formatted = formatNumber(value);
    if (tooltip) attachTooltip(ctx, bar, tooltip, label, `${columnLabel(ctx, config.y)}: ${formatted}`);
    marks.appendChild(bar);

    if (config.labels.show && band.bandwidth > 18) {
      const labelText = config.labels.formatter ? config.labels.formatter(value, label) : formatted;
      marks.appendChild(
        svgElement(
          ctx.doc,
          "text",
          {
            x: x + band.bandwidth / 2,
            y: Math.max(plot.y + 10, (value >= 0 ? y : yScale.scale(0)) - 6),
            "text-anchor": "middle",
            class: "numviz-chart__value-label",
            "data-numviz-part": "value-label"
          },
          labelText
        )
      );
    }
  });

  svg.appendChild(marks);
  drawXLabels(ctx, svg, plot, labels, positions, band.step);

}

function columnLabel(ctx: RenderContext, field: string): string {
  return ctx.data.columns.find((column) => column.key === field)?.label ?? field;
}
