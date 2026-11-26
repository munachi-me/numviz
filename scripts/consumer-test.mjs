#!/usr/bin/env node
/**
 * Installs the packed package into a throwaway consumer project and verifies
 * default, named and namespace imports at runtime and in TypeScript.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
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
import Numviz, { createChart, createTable, version, NumvizError } from "${packageName}";
import * as named from "${packageName}";

if (Numviz.createChart !== createChart) throw new Error("default and named createChart differ");
if (Numviz.createTable !== createTable) throw new Error("default and named createTable differ");
if (named.createTable !== Numviz.createTable) throw new Error("namespace createTable differs");
if (named.createChart !== Numviz.createChart) throw new Error("namespace import differs");
if (named.default !== Numviz) throw new Error("namespace default export differs");
if (Numviz.version !== version) throw new Error("default and named version differ");
if (typeof version !== "string" || version.length === 0) throw new Error("version is missing");

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

console.log(JSON.stringify({ version, checked: ["default", "named", "namespace", "validation", "normalization", "no-dom", "table", "react-entry"] }));
`
  );
  const runtimeOutput = run(process.execPath, ["runtime-check.mjs"], { cwd: fixture }).trim();
  console.log(`runtime imports: ${runtimeOutput}`);

  writeFileSync(
    path.join(fixture, "consumer.ts"),
    `import Numviz, {
  createChart,
  createTable,
  NumvizError,
  type ChartConfig,
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

const error: NumvizError = new NumvizError("example", { code: "INVALID_CONFIG" });
console.log(error.code, Numviz.version);
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
          lib: ["ES2022", "DOM", "DOM.Iterable"],
          noEmit: true,
          skipLibCheck: false
        },
        include: ["consumer.ts"]
      },
      null,
      2
    )
  );
  const tsc = path.join(root, "node_modules", "typescript", "bin", "tsc");
  run(process.execPath, [tsc, "-p", path.join(fixture, "tsconfig.json")], { cwd: fixture });
  console.log("consumer typecheck: declarations resolve for both import styles");
} finally {
  try {
    unlinkSync(tarball);
  } catch {
    // tarball may already be gone
  }
}
