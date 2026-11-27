import { createDashboard } from "../dashboard/dashboard.js";
import type { Dashboard, DashboardConfig } from "../dashboard/types.js";
import { VERSION } from "../version.js";

/** API exposed by the generated standalone dashboard runtime. */
export interface StandaloneRuntime {
  readonly version: string;
  renderDashboard(config: DashboardConfig, target?: string | Element): Dashboard;
}

declare global {
  interface Window {
    NumvizStandalone?: StandaloneRuntime;
  }
}

/** Render a serialized dashboard into the generated page. */
export function renderDashboard(
  config: DashboardConfig,
  target: string | Element = "#numviz-app"
): Dashboard {
  return createDashboard(config).render(target);
}

const runtime: StandaloneRuntime = Object.freeze({
  version: VERSION,
  renderDashboard
});

(globalThis as typeof globalThis & { NumvizStandalone?: StandaloneRuntime }).NumvizStandalone =
  runtime;
