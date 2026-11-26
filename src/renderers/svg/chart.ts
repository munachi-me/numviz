import type { RenderContext } from "../context.js";
import { renderArcChart } from "./arc.js";
import { renderBarChart } from "./bar.js";
import { renderLineChart } from "./line.js";

/** Render a chart into the root element held by the context. */
export function renderChartContent(ctx: RenderContext): void {
  switch (ctx.config.type) {
    case "bar":
      renderBarChart(ctx);
      break;
    case "line":
      renderLineChart(ctx);
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
