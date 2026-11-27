import type { Dashboard, DashboardConfig, DashboardPrintOptions } from "../dashboard/types.js";

/** Built-in report layouts. */
export type ReportType =
  | "executive"
  | "analytical"
  | "kpi"
  | "table"
  | "charts"
  | "dashboard";

/** Optional report metadata. */
export interface ReportMetadata {
  readonly title?: string;
  readonly author?: string;
  readonly subject?: string;
  readonly description?: string;
  readonly createdAt?: string;
}

/** Configuration accepted by {@link createReport}. */
export interface ReportConfig extends DashboardConfig {
  /** Preset report layout. Defaults to `dashboard`. */
  readonly type?: ReportType;
  /** Metadata retained on the returned report handle. */
  readonly metadata?: ReportMetadata;
}

/** Reusable defaults for one report type. */
export interface ReportPreset {
  readonly layout?: DashboardConfig["layout"];
  readonly print?: boolean | DashboardPrintOptions;
  readonly widgetStyle?: DashboardConfig["widgetStyle"];
}

/** A dashboard with report-specific metadata and a typed print method. */
export interface Report extends Dashboard {
  readonly reportType: ReportType;
  readonly metadata?: ReportMetadata;
  print(options?: DashboardPrintOptions): Report;
}
