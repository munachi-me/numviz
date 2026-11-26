import type { ResolvedSeries } from "../../types.js";
import { svgElement } from "../../utils/dom.js";
import { formatCategory, formatNumber } from "../../utils/format.js";
import { bandScale, linearScale } from "../../utils/scales.js";
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
  renderEmptyState,
  type TooltipHandle
} from "./interactions.js";
import { stackSeries } from "./series.js";

function labelText(ctx: RenderContext, value: number, category: string): string {
  return ctx.config.labels.formatter
    ? ctx.config.labels.formatter(value, category)
    : formatNumber(value);
}

function seriesValue(
  row: { readonly values: Readonly<Record<string, unknown>> },
  series: ResolvedSeries
): number | null {
  const raw = row.values[series.field];
  return typeof raw === "number" && Number.isFinite(raw) ? raw : null;
}

function drawValueLabel(
  ctx: RenderContext,
  marks: SVGGElement,
  x: number,
  y: number,
  value: number,
  category: string,
  anchor: "middle" | "start" | "end" = "middle",
  inside = false
): void {
  marks.appendChild(
    svgElement(
      ctx.doc,
      "text",
      {
        x,
        y,
        "text-anchor": anchor,
        class: "numviz-chart__value-label",
        "data-numviz-part": "value-label",
        ...(inside ? { fill: "#FFFFFF", "fill-opacity": 0.95 } : {})
      },
      labelText(ctx, value, category)
    )
  );
}

function wireBar(
  ctx: RenderContext,
  bar: SVGElement,
  tooltip: TooltipHandle | null,
  category: string,
  series: ResolvedSeries,
  value: number,
  index: number
): void {
  const formatted = formatTooltipValue(ctx, value, {
    label: category,
    field: series.field,
    series: series.label,
    index
  });
  const multi = visibleSeries(ctx).length > 1;
  if (tooltip) {
    if (multi) attachTooltip(ctx, bar, tooltip, `${category} · ${series.label}`, formatted);
    else attachTooltip(ctx, bar, tooltip, category, `${series.label}: ${formatted}`);
  }
  attachInteraction(ctx, bar, {
    label: category,
    field: series.field,
    series: series.label,
    value,
    index
  });
  attachHighlight(ctx, bar, "category");
}

export function renderBarChart(ctx: RenderContext): void {
  const { config, data } = ctx;
  const { svg } = createChartSvg(ctx);
  const headerHeight = drawHeader(ctx, svg);
  const legendSpace = reserveLegend(ctx);
  const plot = resolvePlot(config, headerHeight, legendSpace);
  drawLegend(ctx, svg, legendSpace, plot, headerHeight);

  const seriesList = visibleSeries(ctx);
  const isStacked = config.type === "stacked-bar";
  const multi = seriesList.length > 1;
  const stacks = isStacked ? stackSeries(data.rows, seriesList) : null;

  const scaleValues: number[] = [];
  data.rows.forEach((row) => {
    if (isStacked) {
      let positive = 0;
      let negative = 0;
      for (const series of seriesList) {
        const value = seriesValue(row, series);
        if (value === null) continue;
        if (value >= 0) positive += value;
        else negative += value;
      }
      scaleValues.push(positive, negative);
    } else {
      for (const series of seriesList) {
        const value = seriesValue(row, series);
        if (value !== null) scaleValues.push(value);
      }
    }
  });

  if (data.empty || scaleValues.every((value) => value === 0) || seriesList.length === 0) {
    renderEmptyState(ctx, svg, plot);
    return;
  }

  const yScale = linearScale(scaleValues, plot.bottom, plot.y, 5, {
    ...(config.yAxis.min !== undefined ? { min: config.yAxis.min } : {}),
    ...(config.yAxis.max !== undefined ? { max: config.yAxis.max } : {})
  });
  drawNumericAxis(ctx, svg, plot, yScale, config.yAxis, "left");
  drawAxisTitles(ctx, svg, plot);

  const band = bandScale(data.rows.length, plot.x, plot.right, 0.24);
  const categories = data.rows.map((row) => formatCategory(row.values[config.x]));
  const positions = data.rows.map((_, index) => band.x(index) + band.bandwidth / 2);
  const tooltip = config.tooltip.show ? createTooltip(ctx) : null;
  const marks = svgElement(ctx.doc, "g", { "data-numviz-part": "bars" });
  const slotWidth = isStacked || !multi ? band.bandwidth : band.bandwidth / seriesList.length;

  data.rows.forEach((row, index) => {
    const category = categories[index] ?? "";
    seriesList.forEach((series, seriesIndex) => {
      const x = isStacked || !multi ? band.x(index) : band.x(index) + seriesIndex * slotWidth;
      let value: number | null;
      let yTop: number;
      let yBottom: number;
      if (stacks) {
        const range = stacks.get(series.field)?.[index] ?? null;
        if (!range) return;
        value = range.value;
        yTop = yScale.scale(range.y1);
        yBottom = yScale.scale(range.y0);
      } else {
        value = seriesValue(row, series);
        if (value === null) return;
        yTop = yScale.scale(value);
        yBottom = yScale.scale(0);
      }
      if (value === null) return;
      const height = Math.max(1, Math.abs(yBottom - yTop));
      const top = Math.min(yTop, yBottom);
      const bar = svgElement(ctx.doc, "rect", {
        x,
        y: top,
        width: Math.max(1, slotWidth),
        height,
        rx: Math.min(4, slotWidth / 4),
        fill: series.color,
        class: "numviz-chart__mark",
        "data-numviz-part": "bar",
        "data-index": index,
        "data-series": series.index
      });
      wireBar(ctx, bar, tooltip, category, series, value, index);
      marks.appendChild(bar);

      if (config.labels.show && height >= 14) {
        const inside = config.labels.position === "inside" || (config.labels.position === "auto" && isStacked && height > 22);
        const labelY = inside ? top + height / 2 + 4 : value >= 0 ? top - 6 : top + height + 12;
        drawValueLabel(
          ctx,
          marks,
          x + slotWidth / 2,
          Math.max(plot.y + 10, Math.min(plot.bottom - 2, labelY)),
          value,
          category,
          "middle",
          inside
        );
      }
    });
  });

  svg.appendChild(marks);
  drawCategoryAxis(ctx, svg, plot, {
    labels: categories,
    positions,
    cellWidth: band.step,
    axis: config.xAxis,
    orientation: "bottom"
  });
}

export function renderHorizontalBarChart(ctx: RenderContext): void {
  const { config, data } = ctx;
  const { svg } = createChartSvg(ctx);
  const headerHeight = drawHeader(ctx, svg);
  const legendSpace = reserveLegend(ctx);
  const plot = resolvePlot(config, headerHeight, legendSpace);
  drawLegend(ctx, svg, legendSpace, plot, headerHeight);

  const seriesList = visibleSeries(ctx);
  const isStacked = config.type === "stacked-bar";
  const stacks = isStacked ? stackSeries(data.rows, seriesList) : null;
  const scaleValues: number[] = [];
  data.rows.forEach((row) => {
    for (const series of seriesList) {
      const value = seriesValue(row, series);
      if (value !== null) scaleValues.push(value);
    }
  });

  if (data.empty || seriesList.length === 0 || scaleValues.every((value) => value === 0)) {
    renderEmptyState(ctx, svg, plot);
    return;
  }

  const xScale = linearScale(scaleValues, plot.x, plot.right, 5, {
    ...(config.xAxis.min !== undefined ? { min: config.xAxis.min } : {}),
    ...(config.xAxis.max !== undefined ? { max: config.xAxis.max } : {})
  });
  drawNumericAxis(ctx, svg, plot, xScale, config.xAxis, "bottom");
  drawAxisTitles(ctx, svg, plot);

  const band = bandScale(data.rows.length, plot.y, plot.bottom, 0.24);
  const categories = data.rows.map((row) => formatCategory(row.values[config.x]));
  const positions = data.rows.map((_, index) => band.x(index) + band.bandwidth / 2);
  const tooltip = config.tooltip.show ? createTooltip(ctx) : null;
  const marks = svgElement(ctx.doc, "g", { "data-numviz-part": "bars" });
  const slotHeight = isStacked || seriesList.length === 1 ? band.bandwidth : band.bandwidth / seriesList.length;

  data.rows.forEach((row, index) => {
    const category = categories[index] ?? "";
    seriesList.forEach((series, seriesIndex) => {
      const y = isStacked || seriesList.length === 1 ? band.x(index) : band.x(index) + seriesIndex * slotHeight;
      let value: number | null;
      let xStart: number;
      let xEnd: number;
      if (stacks) {
        const range = stacks.get(series.field)?.[index] ?? null;
        if (!range) return;
        value = range.value;
        xStart = xScale.scale(range.y0);
        xEnd = xScale.scale(range.y1);
      } else {
        value = seriesValue(row, series);
        if (value === null) return;
        xStart = xScale.scale(0);
        xEnd = xScale.scale(value);
      }
      if (value === null) return;
      const bar = svgElement(ctx.doc, "rect", {
        x: Math.min(xStart, xEnd),
        y,
        width: Math.max(1, Math.abs(xEnd - xStart)),
        height: Math.max(1, slotHeight),
        rx: Math.min(4, slotHeight / 4),
        fill: series.color,
        class: "numviz-chart__mark",
        "data-numviz-part": "bar",
        "data-index": index,
        "data-series": series.index
      });
      wireBar(ctx, bar, tooltip, category, series, value, index);
      marks.appendChild(bar);

      if (config.labels.show) {
        const inside = config.labels.position === "inside";
        const labelX = inside
          ? (xStart + xEnd) / 2
          : Math.min(plot.right - 4, Math.max(plot.x + 4, xEnd + 6));
        drawValueLabel(
          ctx,
          marks,
          labelX,
          y + slotHeight / 2 + 4,
          value,
          category,
          inside ? "middle" : "start",
          inside
        );
      }
    });
  });

  svg.appendChild(marks);
  drawCategoryAxis(ctx, svg, plot, {
    labels: categories,
    positions,
    cellWidth: band.step,
    axis: config.yAxis,
    orientation: "left"
  });
}
