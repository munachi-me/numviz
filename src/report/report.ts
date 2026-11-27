import { NumvizError } from "../errors.js";
import { createDashboard } from "../dashboard/dashboard.js";
import type { DashboardConfig, DashboardLayout } from "../dashboard/types.js";
import type { Report, ReportConfig, ReportPreset, ReportType } from "./types.js";

const REPORT_TYPES: readonly ReportType[] = [
  "executive",
  "analytical",
  "kpi",
  "table",
  "charts",
  "dashboard"
];

/** Reusable layout and print defaults for each report type. */
export const REPORT_PRESETS: Readonly<Record<ReportType, ReportPreset>> = {
  executive: {
    layout: { columns: { base: 1, sm: 2, lg: 4 }, gap: 16, rowGap: 16, padding: 0 },
    print: { hideFilters: true, pageBreak: "avoid" }
  },
  analytical: {
    layout: { columns: { base: 1, sm: 2, lg: 3 }, gap: 18, rowGap: 18, padding: 0 },
    print: { hideFilters: true, pageBreak: "avoid" }
  },
  kpi: {
    layout: { columns: { base: 1, sm: 2, lg: 4 }, gap: 14, rowGap: 14, padding: 0, variant: "compact" },
    print: { hideFilters: true, pageBreak: "avoid" }
  },
  table: {
    layout: { columns: { base: 1, lg: 1 }, gap: 16, rowGap: 16, padding: 0 },
    print: { hideFilters: true, pageBreak: "auto" }
  },
  charts: {
    layout: { columns: { base: 1, sm: 2, lg: 2 }, gap: 18, rowGap: 18, padding: 0 },
    print: { hideFilters: true, pageBreak: "avoid" }
  },
  dashboard: {
    layout: { columns: { base: 1, sm: 2, lg: 3 }, gap: 16, rowGap: 16, padding: 0 },
    print: { hideFilters: true, pageBreak: "avoid" }
  }
};

function mergeLayout(
  preset: DashboardLayout | undefined,
  override: DashboardLayout | undefined
): DashboardLayout | undefined {
  if (!preset) return override;
  if (!override) return preset;
  return { ...preset, ...override };
}

/**
 * Create a dashboard using a report preset. The returned object is a normal
 * dashboard with `reportType` and optional `metadata` attached.
 */
export function createReport(config: ReportConfig): Report {
  if (config === null || typeof config !== "object" || Array.isArray(config)) {
    throw new NumvizError("`createReport` requires a configuration object.", {
      code: "INVALID_CONFIG"
    });
  }
  const reportType = config.type ?? "dashboard";
  if (!REPORT_TYPES.includes(reportType)) {
    throw new NumvizError(`Unknown report type "${String(reportType)}".`, {
      code: "INVALID_CONFIG",
      path: "type",
      details: { received: reportType }
    });
  }
  const preset = REPORT_PRESETS[reportType];
  const metadata = config.metadata;
  const dashboardConfig: DashboardConfig = { ...config };
  delete (dashboardConfig as { type?: unknown }).type;
  delete (dashboardConfig as { metadata?: unknown }).metadata;
  const title = dashboardConfig.title ?? metadata?.title;
  const description = dashboardConfig.description ?? metadata?.description;
  const layout = mergeLayout(preset.layout, dashboardConfig.layout);
  const resolved: DashboardConfig = {
    ...dashboardConfig,
    ...(title !== undefined ? { title } : {}),
    ...(description !== undefined ? { description } : {}),
    ...(layout !== undefined ? { layout } : {}),
    ...(dashboardConfig.print === undefined && preset.print !== undefined
      ? { print: preset.print }
      : {}),
    ...(dashboardConfig.widgetStyle === undefined && preset.widgetStyle !== undefined
      ? { widgetStyle: preset.widgetStyle }
      : {})
  };
  const dashboard = createDashboard(resolved);
  return Object.assign(dashboard, {
    reportType,
    ...(metadata !== undefined ? { metadata } : {})
  }) as Report;
}
