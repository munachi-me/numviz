import { svgElement } from "../../utils/dom.js";
import { formatNumber } from "../../utils/format.js";
import { linearScale } from "../../utils/scales.js";
import type { RenderContext } from "../context.js";
import { visibleSeries } from "../context.js";
import {
  createChartSvg,
  drawAxisTitles,
  drawHeader,
  drawNumericAxis,
  resolvePlot
} from "./common.js";
import {
  attachHighlight,
  attachInteraction,
  attachTooltip,
  createTooltip,
  formatTooltipValue,
  renderEmptyState
} from "./interactions.js";
import { seriesValues } from "./series.js";

export function renderHistogram(ctx: RenderContext): void {
  const { config, data } = ctx;
  const { svg } = createChartSvg(ctx);
  const headerHeight = drawHeader(ctx, svg);
  const plot = resolvePlot(config, headerHeight, { top: 0, bottom: 0, left: 0, right: 0 });

  const seriesList = visibleSeries(ctx);
  const series = seriesList[0];
  const values = series ? seriesValues(data.rows, series) : [];
  if (values.length === 0 || !series) {
    renderEmptyState(ctx, svg, plot);
    return;
  }

  const min = config.xAxis.min ?? Math.min(...values);
  const rawMax = config.xAxis.max ?? Math.max(...values);
  const max = rawMax === min ? min + 1 : rawMax;
  const binCount = config.bins ?? Math.min(20, Math.max(5, Math.ceil(Math.log2(values.length) + 1)));
  const binWidth = (max - min) / binCount;
  const counts = new Array<number>(binCount).fill(0);
  for (const value of values) {
    if (value < min || value > max) continue;
    const index = Math.min(binCount - 1, Math.floor((value - min) / binWidth));
    counts[index] = (counts[index] ?? 0) + 1;
  }

  const yScale = linearScale(counts, plot.bottom, plot.y, 5, {
    min: 0,
    ...(config.yAxis.max !== undefined ? { max: config.yAxis.max } : {})
  });
  drawNumericAxis(ctx, svg, plot, yScale, config.yAxis, "left");

  const xScale = linearScale([min, max], plot.x, plot.right, 5, {
    min,
    max,
    includeZero: false
  });
  drawNumericAxis(ctx, svg, plot, xScale, config.xAxis, "bottom");
  drawAxisTitles(ctx, svg, plot);

  const tooltip = config.tooltip.show ? createTooltip(ctx) : null;
  const marks = svgElement(ctx.doc, "g", { "data-numviz-part": "bars" });
  const slot = plot.width / binCount;
  counts.forEach((count, index) => {
    const binStart = min + index * binWidth;
    const binEnd = binStart + binWidth;
    const x = plot.x + index * slot;
    const y = yScale.scale(count);
    const bar = svgElement(ctx.doc, "rect", {
      x: x + 1,
      y,
      width: Math.max(1, slot - 2),
      height: Math.max(1, plot.bottom - y),
      rx: 2,
      fill: series.color,
      class: "numviz-chart__mark",
      "data-numviz-part": "bar",
      "data-index": index,
      "data-series": series.index
    });
    if (tooltip) {
      attachTooltip(
        ctx,
        bar,
        tooltip,
        `${formatNumber(binStart)} – ${formatNumber(binEnd)}`,
        `${series.label}: ${formatTooltipValue(ctx, count, {
          label: `${formatNumber(binStart)} – ${formatNumber(binEnd)}`,
          field: series.field,
          series: series.label,
          index
        })}`
      );
    }
    attachInteraction(ctx, bar, {
      label: `${formatNumber(binStart)} – ${formatNumber(binEnd)}`,
      field: series.field,
      series: series.label,
      value: count,
      index
    });
    attachHighlight(ctx, bar, "category");
    marks.appendChild(bar);

    if (config.labels.show && count > 0) {
      marks.appendChild(
        svgElement(
          ctx.doc,
          "text",
          {
            x: x + slot / 2,
            y: Math.max(plot.y + 10, y - 6),
            "text-anchor": "middle",
            class: "numviz-chart__value-label",
            "data-numviz-part": "value-label"
          },
          String(count)
        )
      );
    }
  });
  svg.appendChild(marks);
}

