import type { NormalizedDataset, ResolvedSeries } from "../../types.js";
import { svgElement } from "../../utils/dom.js";
import { formatCategory, formatNumber } from "../../utils/format.js";
import { linearScale } from "../../utils/scales.js";
import type { RenderContext } from "../context.js";
import { visibleSeries } from "../context.js";
import {
  createChartSvg,
  drawAxisTitles,
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

interface ScatterPoint {
  readonly x: number;
  readonly y: number;
  readonly rowIndex: number;
  readonly category: string;
  readonly series: ResolvedSeries;
}

function xValue(data: NormalizedDataset, field: string, rowIndex: number): number | null {
  const value = data.rows[rowIndex]?.values[field];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.getTime();
  return null;
}

export function renderScatterChart(ctx: RenderContext): void {
  const { config, data } = ctx;
  const { svg } = createChartSvg(ctx);
  const headerHeight = drawHeader(ctx, svg);
  const legendSpace = reserveLegend(ctx);
  const plot = resolvePlot(config, headerHeight, legendSpace);
  drawLegend(ctx, svg, legendSpace, plot, headerHeight);

  const seriesList = visibleSeries(ctx);
  const points: ScatterPoint[] = [];
  data.rows.forEach((row, rowIndex) => {
    const x = xValue(data, config.x, rowIndex);
    if (x === null) return;
    const category = formatCategory(row.values[config.x]);
    for (const series of seriesList) {
      const y = row.values[series.field];
      if (typeof y !== "number" || !Number.isFinite(y)) continue;
      points.push({ x, y, rowIndex, category, series });
    }
  });

  if (points.length === 0) {
    renderEmptyState(ctx, svg, plot);
    return;
  }

  const xColumnType = data.columns.find((column) => column.key === config.x)?.type;
  const dateAxis = xColumnType === "date";
  const xScale = linearScale(
    points.map((point) => point.x),
    plot.x,
    plot.right,
    5,
    {
      includeZero: false,
      ...(config.xAxis.min !== undefined ? { min: config.xAxis.min } : {}),
      ...(config.xAxis.max !== undefined ? { max: config.xAxis.max } : {})
    }
  );
  const yScale = linearScale(
    points.map((point) => point.y),
    plot.bottom,
    plot.y,
    5,
    {
      includeZero: false,
      ...(config.yAxis.min !== undefined ? { min: config.yAxis.min } : {}),
      ...(config.yAxis.max !== undefined ? { max: config.yAxis.max } : {})
    }
  );

  drawNumericAxis(
    ctx,
    svg,
    plot,
    xScale,
    config.xAxis,
    "bottom",
    dateAxis ? (value) => formatCategory(new Date(value)) : formatNumber
  );
  drawNumericAxis(ctx, svg, plot, yScale, config.yAxis, "left");
  drawAxisTitles(ctx, svg, plot);

  const tooltip = config.tooltip.show ? createTooltip(ctx) : null;
  const marks = svgElement(ctx.doc, "g", { "data-numviz-part": "points" });
  for (const point of points) {
    const x = xScale.scale(point.x);
    const y = yScale.scale(point.y);
    const formatted = formatNumber(point.y);
    const tooltipValue = formatTooltipValue(ctx, point.y, {
      label: point.category,
      field: point.series.field,
      series: point.series.label,
      index: point.rowIndex
    });
    const circle = svgElement(ctx.doc, "circle", {
      cx: x,
      cy: y,
      r: 4.5,
      fill: point.series.color,
      "fill-opacity": 0.9,
      stroke: ctx.tokens.background,
      "stroke-width": 1.5,
      class: "numviz-chart__mark",
      "data-numviz-part": "point",
      "data-index": point.rowIndex,
      "data-series": point.series.index
    });
    if (tooltip) {
      attachTooltip(
        ctx,
        circle,
        tooltip,
        `${point.category} · ${point.series.label}`,
        tooltipValue
      );
    }
    attachInteraction(ctx, circle, {
      label: point.category,
      field: point.series.field,
      series: point.series.label,
      value: point.y,
      index: point.rowIndex
    });
    attachHighlight(ctx, circle, "series");
    marks.appendChild(circle);

    if (config.labels.show) {
      marks.appendChild(
        svgElement(
          ctx.doc,
          "text",
          {
            x,
            y: y - 9,
            "text-anchor": "middle",
            class: "numviz-chart__value-label",
            "data-numviz-part": "value-label"
          },
          config.labels.formatter ? config.labels.formatter(point.y, point.category) : formatted
        )
      );
    }
  }
  svg.appendChild(marks);

}
