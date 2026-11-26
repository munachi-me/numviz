import type { ResolvedSeries } from "../../types.js";
import { svgElement } from "../../utils/dom.js";
import { formatCategory, formatNumber } from "../../utils/format.js";
import { linearScale } from "../../utils/scales.js";
import type { RenderContext } from "../context.js";
import { visibleSeries } from "../context.js";
import {
  createChartSvg,
  drawAxisTitles,
  drawCategoryAxis,
  drawHeader,
  drawLegend,
  drawNumericAxis,
  reserveLegend,
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

function pointPositions(count: number, start: number, end: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [start + (end - start) / 2];
  return Array.from({ length: count }, (_, index) => start + (index / (count - 1)) * (end - start));
}

function linePath(
  rows: readonly { values: Readonly<Record<string, unknown>> }[],
  series: ResolvedSeries,
  xs: readonly number[],
  scaleY: (value: number) => number
): string {
  const segments: string[] = [];
  let open = false;
  rows.forEach((row, index) => {
    const value = row.values[series.field];
    const x = xs[index];
    if (x === undefined || typeof value !== "number" || !Number.isFinite(value)) {
      open = false;
      return;
    }
    segments.push(`${open ? "L" : "M"}${x.toFixed(2)},${scaleY(value).toFixed(2)}`);
    open = true;
  });
  return segments.join(" ");
}

export function renderLineChart(ctx: RenderContext): void {
  const { config, data } = ctx;
  const { svg } = createChartSvg(ctx);
  const headerHeight = drawHeader(ctx, svg);
  const legendSpace = reserveLegend(ctx);
  const plot = resolvePlot(config, headerHeight, legendSpace);
  drawLegend(ctx, svg, legendSpace, plot, headerHeight);

  const seriesList = visibleSeries(ctx);
  const scaleValues = seriesList.flatMap((series) => seriesValues(data.rows, series));
  if (data.empty || seriesList.length === 0 || scaleValues.length === 0) {
    renderEmptyState(ctx, svg, plot);
    return;
  }

  const yScale = linearScale(scaleValues, plot.bottom, plot.y, 5, {
    ...(config.yAxis.min !== undefined ? { min: config.yAxis.min } : {}),
    ...(config.yAxis.max !== undefined ? { max: config.yAxis.max } : {})
  });
  drawNumericAxis(ctx, svg, plot, yScale, config.yAxis, "left");
  drawAxisTitles(ctx, svg, plot);

  const xs = pointPositions(data.rows.length, plot.x, plot.right);
  const categories = data.rows.map((row) => formatCategory(row.values[config.x]));
  const tooltip = config.tooltip.show ? createTooltip(ctx) : null;
  const area = config.type === "area";
  const multi = seriesList.length > 1;
  const marks = svgElement(ctx.doc, "g", { "data-numviz-part": "series" });
  const baseline = yScale.scale(0);

  seriesList.forEach((series) => {
    const path = linePath(data.rows, series, xs, yScale.scale);
    if (!path) return;
    if (area) {
      const first = xs[0];
      const last = xs[xs.length - 1];
      if (first !== undefined && last !== undefined) {
        marks.appendChild(
          svgElement(ctx.doc, "path", {
            d: `${path} L${last.toFixed(2)},${baseline.toFixed(2)} L${first.toFixed(2)},${baseline.toFixed(2)} Z`,
            fill: series.color,
            "fill-opacity": 0.16,
            stroke: "none",
            "data-numviz-part": "area",
            "data-series": series.index
          })
        );
      }
    }
    marks.appendChild(
      svgElement(ctx.doc, "path", {
        d: path,
        fill: "none",
        stroke: series.color,
        "stroke-width": 2,
        "stroke-linejoin": "round",
        "stroke-linecap": "round",
        "data-numviz-part": "line",
        "data-series": series.index
      })
    );
  });

  const points = svgElement(ctx.doc, "g", { "data-numviz-part": "points" });
  data.rows.forEach((row, index) => {
    const category = categories[index] ?? "";
    const x = xs[index];
    if (x === undefined) return;
    seriesList.forEach((series) => {
      const value = row.values[series.field];
      if (typeof value !== "number" || !Number.isFinite(value)) return;
      const y = yScale.scale(value);
      const formatted = formatNumber(value);
      const tooltipValue = formatTooltipValue(ctx, value, {
        label: category,
        field: series.field,
        series: series.label,
        index
      });
      const point = svgElement(ctx.doc, "circle", {
        cx: x,
        cy: y,
        r: 4,
        fill: ctx.tokens.background,
        stroke: series.color,
        "stroke-width": 2,
        class: "numviz-chart__mark",
        "data-numviz-part": "point",
        "data-index": index,
        "data-series": series.index
      });
      if (tooltip) {
        if (multi) attachTooltip(ctx, point, tooltip, `${category} · ${series.label}`, tooltipValue);
        else attachTooltip(ctx, point, tooltip, category, `${series.label}: ${tooltipValue}`);
      }
      attachInteraction(ctx, point, {
        label: category,
        field: series.field,
        series: series.label,
        value,
        index
      });
      attachHighlight(ctx, point, "series");
      points.appendChild(point);

      if (config.labels.show) {
        points.appendChild(
          svgElement(
            ctx.doc,
            "text",
            {
              x,
              y: y - 10,
              "text-anchor": "middle",
              class: "numviz-chart__value-label",
              "data-numviz-part": "value-label",
              "data-series": series.index
            },
            config.labels.formatter ? config.labels.formatter(value, category) : formatted
          )
        );
      }
    });
  });

  svg.appendChild(marks);
  svg.appendChild(points);
  drawCategoryAxis(ctx, svg, plot, {
    labels: categories,
    positions: xs,
    cellWidth: plot.width / Math.max(1, data.rows.length),
    axis: config.xAxis,
    orientation: "bottom"
  });
}
