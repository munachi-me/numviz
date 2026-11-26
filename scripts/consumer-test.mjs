#!/usr/bin/env node
/**
 * Installs the packed package into a throwaway consumer project and verifies
 * default, named and namespace imports at runtime and in TypeScript.
 */
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync
} from "node:fs";
import path from "node:path";

const root = process.cwd();
const packageName = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")).name;
const fixture = path.join(root, ".tmp", "consumer");

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    encoding: "utf8",
    stdio: "pipe",
    ...options
  });
}

function filesUnder(directory) {
  const files = [];
  for (const entry of readdirSync(directory)) {
    const full = path.join(directory, entry);
    if (statSync(full).isDirectory()) files.push(...filesUnder(full));
    else files.push(full);
  }
  return files;
}

rmSync(fixture, { recursive: true, force: true });
mkdirSync(fixture, { recursive: true });

const packOutput = JSON.parse(run("npm", ["pack", "--json"], { cwd: root }));
const packInfo = Array.isArray(packOutput) ? packOutput[0] : Object.values(packOutput)[0];
if (!packInfo || typeof packInfo.filename !== "string") {
  throw new Error("npm pack did not report a tarball filename");
}
const tarball = path.join(root, packInfo.filename);

try {
  writeFileSync(
    path.join(fixture, "package.json"),
    JSON.stringify(
      {
        name: "numviz-consumer",
        private: true,
        type: "module",
        dependencies: { [packageName]: `file:${tarball}` }
      },
      null,
      2
    )
  );
  run("npm", ["install", "--no-audit", "--no-fund", "--silent"], { cwd: fixture });

  writeFileSync(
    path.join(fixture, "runtime-check.mjs"),
    `import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import Numviz, { createChart, createDashboard, createMetric, createTable, version, NumvizError } from "${packageName}";
import * as named from "${packageName}";

if (Numviz.createChart !== createChart) throw new Error("default and named createChart differ");
if (Numviz.createTable !== createTable) throw new Error("default and named createTable differ");
if (Numviz.createMetric !== createMetric) throw new Error("default and named createMetric differ");
if (Numviz.createDashboard !== createDashboard) throw new Error("default and named createDashboard differ");
if (named.createTable !== Numviz.createTable) throw new Error("namespace createTable differs");
if (named.createMetric !== Numviz.createMetric) throw new Error("namespace createMetric differs");
if (named.createDashboard !== Numviz.createDashboard) throw new Error("namespace createDashboard differs");
if (named.createChart !== Numviz.createChart) throw new Error("namespace import differs");
if (named.default !== Numviz) throw new Error("namespace default export differs");
if (Numviz.version !== version) throw new Error("default and named version differ");
if (typeof version !== "string" || version.length === 0) throw new Error("version is missing");
if (Numviz.NumvizError !== NumvizError) throw new Error("default namespace NumvizError differs");
if (!Object.isFrozen(Numviz)) throw new Error("default namespace is not frozen");
if (Object.keys(Numviz).sort().join(",") !== "NumvizError,createChart,createDashboard,createMetric,createTable,version") {
  throw new Error("default namespace is missing public members");
}

let validationError;
try {
  createChart({ type: "treemap", data: [], x: "a", y: "b" });
} catch (error) {
  validationError = error;
}
if (!(validationError instanceof NumvizError)) throw new Error("validation did not throw NumvizError");
if (validationError.code !== "INVALID_TYPE") throw new Error("unexpected error code: " + validationError.code);

const chart = createChart({
  type: "bar",
  data: [
    { month: "Jan", revenue: "1200" },
    { month: "Feb", revenue: 1800 }
  ],
  x: "month",
  y: "revenue"
});
if (chart.config.y !== "revenue") throw new Error("config was not resolved");
if (chart.data.rows[0].values.revenue !== 1200) throw new Error("numeric strings were not normalized");

let domError;
try {
  chart.render("#chart");
} catch (error) {
  domError = error;
}
if (!domError || domError.code !== "NO_DOM") throw new Error("rendering outside a DOM should fail with NO_DOM");

const table = createTable({
  data: [{ region: "North", revenue: 10 }],
  columns: [{ field: "region", label: "Region" }, { field: "revenue", format: "currency" }],
  searchable: true,
  pagination: true
});
if (table.config.columns.length !== 2) throw new Error("table columns were not resolved");
let tableDomError;
try {
  table.render("#table");
} catch (error) {
  tableDomError = error;
}
if (!tableDomError || tableDomError.code !== "NO_DOM") throw new Error("table rendering should fail with NO_DOM outside a DOM");

const require = createRequire(import.meta.url);
const packageJsonPath = require.resolve("${packageName}/package.json");
const manifest = JSON.parse(readFileSync(packageJsonPath, "utf8"));
if (!manifest.exports || !manifest.exports["./react"]) throw new Error("missing ./react export");
const reactEntry = path.join(path.dirname(packageJsonPath), "dist", "react", "index.js");
if (!existsSync(reactEntry)) throw new Error("missing built React entry");
if (!readFileSync(reactEntry, "utf8").trimStart().startsWith('"use client"')) {
  throw new Error("React entry is missing the use client directive");
}
if (!manifest.peerDependencies || !manifest.peerDependencies.react) throw new Error("react should be an optional peer dependency");
if (manifest.dependencies && Object.keys(manifest.dependencies).length > 0) {
  throw new Error("core package must not have runtime dependencies");
}
if (manifest.version !== version) throw new Error("runtime version differs from package metadata");

const metric = createMetric({
  name: "Revenue",
  data: [
    { region: "North", revenue: 100 },
    { region: "South", revenue: "200" }
  ],
  column: "revenue",
  aggregation: "sum",
  format: "currency",
  comparison: { value: 100 }
});
if (metric.result.value !== 300) throw new Error("metric sum did not normalize numeric strings");
if (metric.result.formattedValue !== "$300.00") throw new Error("metric formatting failed");
if (metric.result.comparison?.percentageChange !== 200) throw new Error("metric comparison failed");
if (metric.result.state !== "positive") throw new Error("metric state failed");
const countMetric = createMetric({
  name: "North rows",
  data: [
    { region: "North", revenue: 100 },
    { region: "South", revenue: 200 }
  ],
  aggregation: "count",
  filter: { region: "North" }
});
if (countMetric.result.value !== 1) throw new Error("metric filter or count failed");

const dashboard = createDashboard({
  title: "Revenue overview",
  description: "Independent metric, chart and table data",
  layout: { columns: { base: 1, sm: 2, lg: 3 }, breakpoints: { sm: 500, md: 700, lg: 900 } },
  format: { locale: "en-US", currency: "USD" },
  components: [
    {
      id: "total",
      type: "metric",
      name: "Revenue",
      data: [{ region: "North", revenue: 100 }, { region: "South", revenue: 200 }],
      column: "revenue",
      aggregation: "sum",
      format: "currency"
    },
    {
      id: "monthly",
      type: "chart",
      chartType: "bar",
      data: [{ month: "Jan", revenue: 100 }, { month: "Feb", revenue: 200 }],
      x: "month",
      y: "revenue"
    },
    {
      id: "people",
      type: "table",
      data: [{ name: "Ada", salary: 120000 }],
      columns: [{ field: "name" }, { field: "salary", format: "currency" }]
    }
  ]
});
if (dashboard.widgets.length !== 3) throw new Error("dashboard components were not created");
if (dashboard.config.layout.columns.lg !== 3) throw new Error("dashboard layout was not resolved");
if (dashboard.config.format.currency !== "USD") throw new Error("dashboard format was not resolved");
let dashboardDomError;
try {
  dashboard.render("#dashboard");
} catch (error) {
  dashboardDomError = error;
}
if (!dashboardDomError || dashboardDomError.code !== "NO_DOM") {
  throw new Error("dashboard rendering should fail with NO_DOM outside a DOM");
}
dashboard.destroy();

console.log(JSON.stringify({ version, checked: ["default", "named", "namespace", "validation", "normalization", "no-dom", "table", "metric", "dashboard", "react-entry"] }));
`
  );
  const runtimeOutput = run(process.execPath, ["runtime-check.mjs"], { cwd: fixture }).trim();
  console.log(`runtime imports: ${runtimeOutput}`);

  const distDirectory = path.join(fixture, "node_modules", packageName, "dist");
  const coreFiles = filesUnder(distDirectory).filter(
    (file) => file.endsWith(".js") && !file.includes(`${path.sep}react${path.sep}`)
  );
  if (coreFiles.length === 0) throw new Error("core build output is missing");
  for (const file of coreFiles) {
    const source = readFileSync(file, "utf8");
    if (/(?:from|require\()\s*["']react(?:\/[^"']*)?["']/.test(source)) {
      throw new Error(`core build imports React: ${path.relative(fixture, file)}`);
    }
  }
  if (existsSync(path.join(fixture, "node_modules", "react"))) {
    throw new Error("core consumer fixture unexpectedly has React installed");
  }

  const fixtureManifestPath = path.join(fixture, "package.json");
  const fixtureManifest = JSON.parse(readFileSync(fixtureManifestPath, "utf8"));
  fixtureManifest.dependencies.react = "^18.3.1";
  fixtureManifest.dependencies["react-dom"] = "^18.3.1";
  fixtureManifest.devDependencies = {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1"
  };
  writeFileSync(fixtureManifestPath, JSON.stringify(fixtureManifest, null, 2));
  run("npm", ["install", "--no-audit", "--no-fund", "--silent"], { cwd: fixture });

  writeFileSync(
    path.join(fixture, "react-check.mjs"),
    `import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Dashboard, DataTable, Metric } from "${packageName}/react";

const data = [
  { region: "North", revenue: 100, salary: 120000 },
  { region: "South", revenue: 200, salary: 145000 }
];

const tableHtml = renderToStaticMarkup(
  createElement(DataTable, { data, pagination: false })
);
if (!tableHtml.includes('data-numviz-react="table"')) {
  throw new Error("React DataTable SSR host is missing");
}
if (tableHtml.includes("<table")) {
  throw new Error("React DataTable touched the DOM during server rendering");
}

const metricHtml = renderToStaticMarkup(
  createElement(Metric, {
    name: "Revenue",
    data,
    column: "revenue",
    aggregation: "sum",
    format: "currency",
    comparison: { value: 200 }
  })
);
if (!metricHtml.includes('data-numviz-react="metric"')) {
  throw new Error("React Metric SSR host is missing");
}
if (metricHtml.includes("$300.00")) {
  throw new Error("React Metric computed values during server rendering");
}

const dashboardHtml = renderToStaticMarkup(
  createElement(Dashboard, {
    title: "Overview",
    components: [
      {
        id: "total",
        type: "metric",
        name: "Revenue",
        data,
        column: "revenue",
        aggregation: "sum"
      }
    ]
  })
);
if (!dashboardHtml.includes('data-numviz-react="dashboard"')) {
  throw new Error("React Dashboard SSR host is missing");
}
if (dashboardHtml.includes("numviz-dashboard__title")) {
  throw new Error("React Dashboard touched the DOM during server rendering");
}

console.log(JSON.stringify({ entry: "react", ssr: true, exports: ["Dashboard", "DataTable", "Metric"] }));`
  );
  const reactOutput = run(process.execPath, ["react-check.mjs"], { cwd: fixture }).trim();
  console.log(`react imports: ${reactOutput}`);

  writeFileSync(
    path.join(fixture, "consumer.ts"),
    `import Numviz, {
  createChart,
  createDashboard,
  createMetric,
  createTable,
  NumvizError,
  type ChartConfig,
  type Dashboard,
  type DashboardConfig,
  type MetricConfig,
  type TableConfig
} from "${packageName}";

const config: ChartConfig = {
  type: "bar",
  data: [{ month: "Jan", revenue: 1200 }],
  x: "month",
  y: "revenue",
  theme: { mode: "dark", chartPalette: ["#6366F1"] }
};

const namedChart = createChart(config);
const namespaceChart = Numviz.createChart(config);
namedChart.render(document.body);
namespaceChart.destroy();

const tableConfig: TableConfig = {
  data: [{ name: "Ada", salary: 120000 }],
  columns: [{ field: "name" }, { field: "salary", format: "currency" }],
  searchable: true,
  pagination: true
};
const table = createTable(tableConfig);
const namespaceTable = Numviz.createTable(tableConfig);
namespaceTable.destroy();
table.getState();

const metricConfig: MetricConfig = {
  name: "Revenue",
  data: [{ region: "North", revenue: 120000 }],
  column: "revenue",
  aggregation: "sum",
  format: "currency",
  comparison: { value: 100000 }
};
const metric = createMetric(metricConfig);
const namespaceMetric = Numviz.createMetric(metricConfig);
metric.result.value;
namespaceMetric.destroy();

const dashboardConfig: DashboardConfig = {
  title: "Overview",
  components: [
    {
      id: "revenue",
      type: "metric",
      name: "Revenue",
      data: [{ revenue: 120000 }],
      column: "revenue",
      aggregation: "sum"
    },
    {
      id: "table",
      type: "table",
      data: [{ name: "Ada", salary: 120000 }]
    }
  ]
};
const dashboard: Dashboard = createDashboard(dashboardConfig);
const namespaceDashboard: Dashboard = Numviz.createDashboard(dashboardConfig);
dashboard.getWidget("revenue")?.instance;
dashboard.config.layout.columns.base;
namespaceDashboard.destroy();
dashboard.destroy();

const error: NumvizError = new NumvizError("example", { code: "INVALID_CONFIG" });
console.log(error.code, Numviz.version);
`
  );
  writeFileSync(
    path.join(fixture, "react-consumer.tsx"),
    `import {
  Dashboard,
  DataTable,
  Metric,
  type DashboardHandle,
  type DashboardProps,
  type DataTableHandle,
  type DataTableProps,
  type MetricHandle,
  type MetricProps
} from "${packageName}/react";
import type { MetricResult, TableState } from "${packageName}";

const tableProps: DataTableProps = {
  data: [{ name: "Ada", salary: 120000 }],
  columns: [{ field: "name" }, { field: "salary", format: "currency" }],
  pagination: true,
  searchable: true
};
const table = (
  <DataTable
    {...tableProps}
    sort={{ field: "salary", direction: "desc" }}
    page={1}
    search="ada"
    selectedRows={[0]}
  />
);

const metricProps: MetricProps = {
  name: "Revenue",
  data: [{ revenue: 120 }],
  column: "revenue",
  aggregation: "sum",
  format: "currency",
  icon: "$"
};
const metric = <Metric {...metricProps} comparison={{ value: 100 }} variant="highlight" />;

const dashboardProps: DashboardProps = {
  title: "Overview",
  components: [
    {
      id: "revenue",
      type: "metric",
      name: "Revenue",
      data: [{ revenue: 120 }],
      column: "revenue"
    },
    { id: "table", type: "table", data: [{ name: "Ada" }] }
  ]
};
const dashboard = <Dashboard {...dashboardProps} style={{ minHeight: 320 }} />;

function readHandles(
  tableHandle: DataTableHandle | null,
  metricHandle: MetricHandle | null,
  dashboardHandle: DashboardHandle | null
): {
  state: TableState | undefined;
  result: MetricResult | undefined;
  widgets: number | undefined;
} {
  return {
    state: tableHandle?.getTable()?.getState(),
    result: metricHandle?.getMetric()?.result,
    widgets: dashboardHandle?.getDashboard()?.widgets.length
  };
}
void table;
void metric;
void dashboard;
void readHandles;
`
  );
  writeFileSync(
    path.join(fixture, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          strict: true,
          target: "ES2022",
          module: "NodeNext",
          moduleResolution: "NodeNext",
          jsx: "react-jsx",
          lib: ["ES2022", "DOM", "DOM.Iterable"],
          noEmit: true,
          skipLibCheck: false
        },
        include: ["consumer.ts", "react-consumer.tsx"]
      },
      null,
      2
    )
  );
  const tsc = path.join(root, "node_modules", "typescript", "bin", "tsc");
  run(process.execPath, [tsc, "-p", path.join(fixture, "tsconfig.json")], { cwd: fixture });
  console.log(
    "consumer typecheck: chart, table, metric, dashboard and React declarations resolve"
  );
} finally {
  try {
    unlinkSync(tarball);
  } catch {
    // tarball may already be gone
  }
}
