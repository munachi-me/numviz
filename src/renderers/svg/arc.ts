import type { NormalizedValue } from "../../types.js";
import { svgElement } from "../../utils/dom.js";
import { formatCategory, formatNumber } from "../../utils/format.js";
import type { RenderContext } from "../context.js";
import {
  attachTooltip,
  createChartSvg,
  createTooltip,
  drawHeader,
  drawLegend,
  renderEmptyState,
  reserveLegend,
  resolvePlot
} from "./common.js";

interface Slice {
  readonly index: number;
  readonly label: string;
  readonly value: number;
  readonly color: string;
  readonly startAngle: number;
  readonly endAngle: number;
}

function polar(cx: number, cy: number, radius: number, angle: number): { x: number; y: number } {
  return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
}

function arcPath(
  cx: number,
  cy: number,
  outerRadius: number,
  innerRadius: number,
  startAngle: number,
  endAngle: number
): string {
  const outerStart = polar(cx, cy, outerRadius, startAngle);
  const outerEnd = polar(cx, cy, outerRadius, endAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  if (innerRadius <= 0) {
    return [
      `M${cx},${cy}`,
      `L${outerStart.x.toFixed(2)},${outerStart.y.toFixed(2)}`,
      `A${outerRadius},${outerRadius} 0 ${largeArc} 1 ${outerEnd.x.toFixed(2)},${outerEnd.y.toFixed(2)}`,
      "Z"
    ].join(" ");
  }
  const innerEnd = polar(cx, cy, innerRadius, endAngle);
  const innerStart = polar(cx, cy, innerRadius, startAngle);
  return [
    `M${outerStart.x.toFixed(2)},${outerStart.y.toFixed(2)}`,
    `A${outerRadius},${outerRadius} 0 ${largeArc} 1 ${outerEnd.x.toFixed(2)},${outerEnd.y.toFixed(2)}`,
    `L${innerEnd.x.toFixed(2)},${innerEnd.y.toFixed(2)}`,
    `A${innerRadius},${innerRadius} 0 ${largeArc} 0 ${innerStart.x.toFixed(2)},${innerStart.y.toFixed(2)}`,
    "Z"
  ].join(" ");
}

export function renderArcChart(ctx: RenderContext): void {
  const { config, data } = ctx;
  const { svg } = createChartSvg(ctx);
  const headerHeight = drawHeader(ctx, svg);
  const legendSpace = reserveLegend(ctx);
  const plot = resolvePlot(config, headerHeight, legendSpace);
  drawLegend(ctx, svg, legendSpace, plot, headerHeight);

  const plottable = data.rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => {
      const value = row.values[config.y];
      return typeof value === "number" && Number.isFinite(value) && value > 0;
    });

  const total = plottable.reduce((sum, { row }) => sum + (row.values[config.y] as number), 0);
  if (data.empty || plottable.length === 0 || total <= 0) {
    renderEmptyState(ctx, svg, plot);
    return;
  }

  const cx = plot.x + plot.width / 2;
  const cy = plot.y + plot.height / 2;
  const outerRadius = Math.max(20, Math.min(plot.width, plot.height) / 2 - 8);
  const innerRadius = config.type === "doughnut" ? outerRadius * 0.58 : 0;
  const tooltip = config.tooltip.show ? createTooltip(ctx) : null;

  let angle = -Math.PI / 2;
  const slices: Slice[] = plottable.map(({ row, index }) => {
    const value = row.values[config.y] as number;
    const sweep = (value / total) * Math.PI * 2;
    const slice: Slice = {
      index,
      label: formatCategory(row.values[config.x] as NormalizedValue),
      value,
      color: config.palette[index % config.palette.length] as string,
      startAngle: angle,
      endAngle: angle + sweep
    };
    angle += sweep;
    return slice;
  });

  const marks = svgElement(ctx.doc, "g", { "data-numviz-part": "slices" });
  for (const slice of slices) {
    const sweep = slice.endAngle - slice.startAngle;
    const path = svgElement(ctx.doc, "path", {
      d: arcPath(cx, cy, outerRadius, innerRadius, slice.startAngle, slice.endAngle),
      fill: slice.color,
      stroke: ctx.tokens.background,
      "stroke-width": 2,
      class: "numviz-chart__mark",
      "data-numviz-part": "slice",
      "data-index": slice.index
    });
    const percent = (slice.value / total) * 100;
    const valueText = config.tooltip.formatter
      ? config.tooltip.formatter(slice.value, {
          label: slice.label,
          field: config.y,
          index: slice.index
        })
      : `${formatNumber(slice.value)} (${percent.toFixed(1)}%)`;
    if (tooltip) attachTooltip(ctx, path, tooltip, slice.label, valueText);
    marks.appendChild(path);

    if (config.labels.show && sweep > 0.35) {
      const mid = slice.startAngle + sweep / 2;
      const radius = innerRadius > 0 ? (outerRadius + innerRadius) / 2 : outerRadius * 0.68;
      const point = polar(cx, cy, radius, mid);
      marks.appendChild(
        svgElement(
          ctx.doc,
          "text",
          {
            x: point.x,
            y: point.y + 4,
            "text-anchor": "middle",
            class: "numviz-chart__value-label",
            "data-numviz-part": "value-label",
            fill: "#FFFFFF"
          },
          config.labels.formatter ? config.labels.formatter(slice.value, slice.label) : `${Math.round(percent)}%`
        )
      );
    }
  }
  svg.appendChild(marks);

  if (config.type === "doughnut") {
    svg.appendChild(
      svgElement(
        ctx.doc,
        "text",
        {
          x: cx,
          y: cy - 2,
          "text-anchor": "middle",
          class: "numviz-chart__title",
          "data-numviz-part": "center-total"
        },
        formatNumber(total)
      )
    );
    svg.appendChild(
      svgElement(
        ctx.doc,
        "text",
        {
          x: cx,
          y: cy + 16,
          "text-anchor": "middle",
          class: "numviz-chart__subtitle"
        },
        columnLabel(ctx, config.y)
      )
    );
  }
}

function columnLabel(ctx: RenderContext, field: string): string {
  return ctx.data.columns.find((column) => column.key === field)?.label ?? field;
}
