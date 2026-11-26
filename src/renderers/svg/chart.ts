import type { RenderContext } from "../context.js";
import { renderArcChart } from "./arc.js";
import { renderBarChart, renderHorizontalBarChart } from "./bar.js";
import { renderHistogram } from "./histogram.js";
import { renderLineChart } from "./line.js";
import { renderRadarChart } from "./radar.js";
import { renderScatterChart } from "./scatter.js";

/** Render a chart into the root element held by the context. */
export function renderChartContent(ctx: RenderContext): void {
  switch (ctx.config.type) {
    case "bar":
    case "grouped-bar":
    case "stacked-bar":
      renderBarChart(ctx);
      break;
    case "horizontal-bar":
      renderHorizontalBarChart(ctx);
      break;
    case "line":
    case "area":
      renderLineChart(ctx);
      break;
    case "scatter":
      renderScatterChart(ctx);
      break;
    case "histogram":
      renderHistogram(ctx);
      break;
    case "radar":
      renderRadarChart(ctx);
      break;
    case "pie":
    case "doughnut":
      renderArcChart(ctx);
      break;
    default: {
      const exhaustive: never = ctx.config.type;
      throw new Error(`Unsupported chart type: ${String(exhaustive)}`);
    }
  }
}
