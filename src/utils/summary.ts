import type { NormalizedDataset, ResolvedChartConfig } from "../types.js";

/** Human-readable chart summary used by assistive technology and exports. */
export function chartSummary(config: ResolvedChartConfig, data: NormalizedDataset): string {
  const rows = data.rows.length;
  const points = `${rows} ${rows === 1 ? "point" : "points"}`;
  const series = config.series.map((item) => item.label || item.field);
  const seriesText =
    series.length === 1 ? `the ${series[0]} series` : `${series.length} series`;
  const subject =
    config.type === "histogram"
      ? `the distribution of ${config.y}`
      : `${config.y} by ${config.x}`;
  const title = config.title ? `${config.title}. ` : "";
  return `${title}A ${config.type} chart of ${subject} with ${points} across ${seriesText}.`;
}
