import { svgElement } from "../../utils/dom.js";
import { formatCategory } from "../../utils/format.js";
import type { RenderContext } from "../context.js";
import { visibleSeries } from "../context.js";
import {
  createChartSvg,
  drawHeader,
  drawLegend,
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

export function renderRadarChart(ctx: RenderContext): void {
  const { config, data } = ctx;
  const { svg } = createChartSvg(ctx);
  const headerHeight = drawHeader(ctx, svg);
  const legendSpace = reserveLegend(ctx);
  const plot = resolvePlot(config, headerHeight, legendSpace);
  drawLegend(ctx, svg, legendSpace, plot, headerHeight);

  const seriesList = visibleSeries(ctx);
  const categories = data.rows.map((row) => formatCategory(row.values[config.x]));
  const scaleValues = seriesList.flatMap((series) => seriesValues(data.rows, { ...series }));
  const maxValue = Math.max(0, ...scaleValues);

  if (data.empty || seriesList.length === 0 || categories.length < 3 || maxValue <= 0) {
    renderEmptyState(ctx, svg, plot, categories.length > 0 ? "Not enough data to display" : undefined);
    return;
  }

  const cx = plot.x + plot.width / 2;
  const cy = plot.y + plot.height / 2;
  const radius = Math.max(20, Math.min(plot.width, plot.height) / 2 - 34);
  const rings = 4;
  const step = (Math.PI * 2) / categories.length;
  const angleAt = (index: number): number => -Math.PI / 2 + index * step;
  const pointAt = (index: number, value: number): { x: number; y: number } => {
    const r = (Math.max(0, value) / maxValue) * radius;
    const angle = angleAt(index);
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  };

  const grid = svgElement(ctx.doc, "g", { "data-numviz-part": "radar-grid" });
  for (let ring = 1; ring <= rings; ring += 1) {
    grid.appendChild(
      svgElement(ctx.doc, "circle", {
        cx,
        cy,
        r: (radius * ring) / rings,
        fill: "none",
        class: "numviz-chart__grid-line"
      })
    );
  }
  categories.forEach((label, index) => {
    const outer = pointAt(index, maxValue);
    grid.appendChild(
      svgElement(ctx.doc, "line", {
        x1: cx,
        y1: cy,
        x2: outer.x,
        y2: outer.y,
        class: "numviz-chart__grid-line"
      })
    );
    if (config.xAxis.show) {
      const labelPoint = {
        x: cx + (radius + 16) * Math.cos(angleAt(index)),
        y: cy + (radius + 16) * Math.sin(angleAt(index))
      };
      const anchor =
        Math.abs(labelPoint.x - cx) < 4 ? "middle" : labelPoint.x > cx ? "start" : "end";
      const text = config.xAxis.tickFormat
        ? String(config.xAxis.tickFormat(label))
        : label;
      grid.appendChild(
        svgElement(
          ctx.doc,
          "text",
          {
            x: labelPoint.x,
            y: labelPoint.y + 4,
            "text-anchor": anchor,
            class: "numviz-chart__tick-label"
          },
          text
        )
      );
    }
  });
  svg.appendChild(grid);

  const tooltip = config.tooltip.show ? createTooltip(ctx) : null;
  const marks = svgElement(ctx.doc, "g", { "data-numviz-part": "series" });
  for (const series of seriesList) {
    const points = categories.map((_, index) => {
      const value = data.rows[index]?.values[series.field];
      const numeric = typeof value === "number" && Number.isFinite(value) ? value : 0;
      return pointAt(index, numeric);
    });
    const path = points
      .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(2)},${point.y.toFixed(2)}`)
      .join(" ");
    marks.appendChild(
      svgElement(ctx.doc, "path", {
        d: `${path} Z`,
        fill: series.color,
        "fill-opacity": 0.14,
        stroke: series.color,
        "stroke-width": 2,
        "data-numviz-part": "radar-area",
        "data-series": series.index
      })
    );

    points.forEach((point, index) => {
      const value = data.rows[index]?.values[series.field];
      const numeric = typeof value === "number" && Number.isFinite(value) ? value : null;
      const category = categories[index] ?? "";
      const circle = svgElement(ctx.doc, "circle", {
        cx: point.x,
        cy: point.y,
        r: 3.5,
        fill: series.color,
        stroke: ctx.tokens.background,
        "stroke-width": 1.5,
        class: "numviz-chart__mark",
        "data-numviz-part": "point",
        "data-index": index,
        "data-series": series.index
      });
      if (tooltip) {
        attachTooltip(
          ctx,
          circle,
          tooltip,
          `${category} · ${series.label}`,
          numeric === null
            ? "—"
            : formatTooltipValue(ctx, numeric, {
                label: category,
                field: series.field,
                series: series.label,
                index
              })
        );
      }
      attachInteraction(ctx, circle, {
        label: category,
        field: series.field,
        series: series.label,
        value: numeric,
        index
      });
      attachHighlight(ctx, circle, "series");
      marks.appendChild(circle);
    });
  }
  svg.appendChild(marks);
}
