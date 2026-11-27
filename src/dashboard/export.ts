import { NumvizError } from "../errors.js";
import { resolveThemeConfig } from "../theme/validate.js";
import { isPlainObject, requireNonEmptyString } from "../utils/validate.js";
import { VERSION } from "../version.js";
import { resolveDashboard } from "./resolve.js";
import type {
  DashboardComponent,
  DashboardConfig,
  DashboardDataMode,
  DashboardExportOptions,
  DashboardExportResult,
  DashboardHeaderConfig,
  DashboardFooterConfig,
  DashboardLayout
} from "./types.js";

const RUNTIME_URL = new URL("../../dist/standalone/numviz-runtime.js", import.meta.url);
const DEFAULT_PAGE_BACKGROUND = "#F4F6FB";

interface ExportRuntime {
  readonly readFile: (path: string | URL, encoding: "utf8") => Promise<string>;
  readonly mkdir: (path: string, options: { recursive: boolean }) => Promise<unknown>;
  readonly writeFile: (path: string, data: string, encoding: "utf8") => Promise<unknown>;
}

interface ExportPath {
  readonly resolve: (...parts: string[]) => string;
  readonly dirname: (path: string) => string;
  readonly basename: (path: string) => string;
  readonly extname: (path: string) => string;
  readonly join: (...parts: string[]) => string;
}

function invalid(message: string, path?: string): NumvizError {
  return new NumvizError(message, { code: "INVALID_CONFIG", path });
}

function validateOptions(options: DashboardExportOptions): Required<Pick<DashboardExportOptions, "format" | "data">> {
  if (!isPlainObject(options)) {
    throw invalid("`export` options must be an object.", "options");
  }
  const format = options.format ?? "html";
  if (format !== "html") {
    throw invalid("Only the `html` export format is supported.", "format");
  }
  const data = options.data ?? "embedded";
  if (data !== "embedded" && data !== "external") {
    throw invalid("`data` must be `embedded` or `external`.", "data");
  }
  requireNonEmptyString(options.output, "output");
  if (options.title !== undefined) requireNonEmptyString(options.title, "title");
  if (options.description !== undefined) requireNonEmptyString(options.description, "description");
  if (options.logo !== undefined) requireNonEmptyString(options.logo, "logo");
  if (options.background !== undefined) requireNonEmptyString(options.background, "background");
  if (options.fontFamily !== undefined) requireNonEmptyString(options.fontFamily, "fontFamily");
  return { format, data };
}

function applyBranding(config: DashboardConfig, options: DashboardExportOptions): DashboardConfig {
  const theme = resolveThemeConfig({
    ...(config.theme ?? {}),
    ...(options.theme ?? {}),
    ...(options.fontFamily !== undefined ? { fontFamily: options.fontFamily } : {})
  });
  const next: DashboardConfig = {
    ...config,
    ...(options.title !== undefined ? { title: options.title } : {}),
    ...(options.description !== undefined ? { description: options.description } : {}),
    ...(options.background !== undefined ? { background: options.background } : {}),
    ...(Object.keys(theme).length > 0 ? { theme } : {}),
    ...(options.layout !== undefined ? { layout: options.layout } : {})
  };

  let header: DashboardHeaderConfig | string | false | undefined = options.header;
  if (header === undefined) header = next.header;
  if (
    options.header === undefined &&
    (options.title !== undefined || options.description !== undefined || options.logo !== undefined)
  ) {
    if (header === false) {
      header = {
        ...(options.title !== undefined ? { title: options.title } : {}),
        ...(options.description !== undefined ? { description: options.description } : {}),
        ...(options.logo !== undefined ? { logo: options.logo } : {})
      };
    } else if (typeof header === "string") {
      header = {
        text: header,
        ...(options.title !== undefined ? { title: options.title } : {}),
        ...(options.description !== undefined ? { description: options.description } : {}),
        ...(options.logo !== undefined ? { logo: options.logo } : {})
      };
    } else {
      header = {
        ...(header ?? {}),
        ...(options.title !== undefined ? { title: options.title } : {}),
        ...(options.description !== undefined ? { description: options.description } : {}),
        ...(options.logo !== undefined ? { logo: options.logo } : {})
      };
    }
  }

  const footer: DashboardFooterConfig | string | false | undefined =
    options.footer !== undefined ? options.footer : next.footer;
  const layout: DashboardLayout = {
    ...(next.layout ?? {}),
    align: next.layout?.align ?? "start"
  };
  return {
    ...next,
    layout,
    ...(header !== undefined ? { header } : {}),
    ...(footer !== undefined ? { footer } : {})
  };
}

function assertSerializableConfig(config: DashboardConfig): void {
  for (const component of config.components) {
    if (component.type === "custom") {
      throw invalid(
        "Custom dashboard components cannot be exported because their render functions are not serializable.",
        `components.${component.id}.render`
      );
    }
  }
  for (const filter of config.filters ?? []) {
    if (filter.type === "custom") {
      throw invalid(
        "Custom dashboard filters cannot be exported because their render functions are not serializable.",
        `filters.${filter.id}.render`
      );
    }
  }
}

function splitExternalData(config: DashboardConfig): {
  readonly config: DashboardConfig;
  readonly data: Record<string, unknown>;
} {
  const data: Record<string, unknown> = {};
  const components = config.components.map((component) => {
    if (component.type !== "chart" && component.type !== "table" && component.type !== "metric") {
      return component;
    }
    const value = (component as DashboardComponent & { data?: unknown }).data;
    if (value !== undefined) data[component.id] = value;
    return { ...component, data: [] } as DashboardComponent;
  });
  return { config: { ...config, components }, data };
}

function serialize(value: unknown, path: string): string {
  try {
    const result = JSON.stringify(value);
    if (result === undefined) throw new Error("Value is not JSON serializable.");
    return result.replaceAll("<", "\\u003c");
  } catch (error) {
    throw new NumvizError(`Unable to serialize ${path} for standalone export.`, {
      code: "EXPORT_FAILED",
      path,
      cause: error
    });
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeInlineScript(value: string): string {
  return value.replace(/<\/script/gi, "<\\/script");
}

function shellCss(config: DashboardConfig): string {
  const background = config.background ?? config.theme?.background ?? DEFAULT_PAGE_BACKGROUND;
  const colorScheme = config.theme?.mode === "dark" ? "dark" : "light";
  const fontFamily =
    config.theme?.fontFamily ??
    'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  return `:root { color-scheme: ${colorScheme}; }
* { box-sizing: border-box; }
html, body { min-height: 100%; }
body {
  margin: 0;
  background: ${background};
  color: #0f172a;
  font-family: ${fontFamily};
}
#numviz-app {
  width: 100%;
  max-width: 1320px;
  margin: 0 auto;
  padding: 32px 20px 48px;
}
@media (max-width: 640px) {
  #numviz-app { padding: 20px 12px 32px; }
}
@media print {
  @page { margin: 12mm; }
  html, body { background: #fff !important; }
  #numviz-app { max-width: none; padding: 0; }
  .numviz-dashboard__filters,
  .numviz-dashboard__filter-clear,
  .numviz-dashboard__filter-chip-clear,
  .numviz-table__toolbar,
  .numviz-table__footer,
  .numviz-table__sort {
    display: none !important;
  }
  .numviz-dashboard__widget {
    break-inside: avoid;
    box-shadow: none !important;
  }
  .numviz-chart__mark {
    animation: none !important;
    transition: none !important;
  }
}
.numviz-standalone__error {
  margin: 48px auto;
  max-width: 720px;
  padding: 20px;
  border: 1px solid #fecaca;
  border-radius: 12px;
  background: #fef2f2;
  color: #991b1b;
  font-size: 14px;
  line-height: 1.5;
}
`;
}

function bootstrapScript(config: DashboardConfig, external: boolean): string {
  const serialized = escapeInlineScript(serialize(config, "dashboard"));
  return `(function () {
  var config = ${serialized};
  var target = "#numviz-app";
  function fail(error) {
    console.error(error);
    var element = document.querySelector(target);
    if (element) {
      element.textContent = "Unable to load this dashboard. " + (error && error.message ? error.message : "");
      element.className = "numviz-standalone__error";
    }
  }
  function mount() {
    if (!window.NumvizStandalone || typeof window.NumvizStandalone.renderDashboard !== "function") {
      throw new Error("The Numviz standalone runtime did not load.");
    }
    window.NumvizStandalone.renderDashboard(config, target);
  }
  ${
    external
      ? `fetch("./data/data.json", { cache: "no-store" })
    .then(function (response) {
      if (!response.ok) throw new Error("Unable to load data/data.json (" + response.status + ").");
      return response.json();
    })
    .then(function (payload) {
      var values = payload && payload.components ? payload.components : {};
      config.components.forEach(function (component) {
        if (Object.prototype.hasOwnProperty.call(values, component.id)) component.data = values[component.id];
      });
      mount();
    })
    .catch(fail);`
      : "try { mount(); } catch (error) { fail(error); }"
  }
})();`;
}

function pageHtml(options: {
  readonly title: string;
  readonly css: string;
  readonly runtime: string | null;
  readonly bootstrap: string;
  readonly singleFile: boolean;
}): string {
  const title = escapeHtml(options.title);
  const styles = options.singleFile
    ? `<style>${escapeInlineScript(options.css)}</style>`
    : `<link rel="stylesheet" href="./assets/styles.css" />`;
  const scripts = options.singleFile
    ? `<script>${escapeInlineScript(options.runtime ?? "")}</script>\n<script>${options.bootstrap}</script>`
    : `<script src="./assets/numviz/runtime.js"></script>\n<script src="./assets/dashboard.js"></script>`;
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    ${styles}
  </head>
  <body>
    <main id="numviz-app"></main>
    <noscript>This dashboard requires JavaScript.</noscript>
    ${scripts}
  </body>
</html>
`;
}

function readme(options: {
  readonly title: string;
  readonly data: DashboardDataMode;
  readonly external: boolean;
}): string {
  return `# ${options.title}

Generated by Numviz ${VERSION}.

## Run locally

The dashboard is a static site. Serve this directory over HTTP:

\`\`\`bash
npx serve .
# or
python3 -m http.server 8000
\`\`\`

Do not open \`index.html\` through \`file://\` when using external data, because
browsers block local JSON fetches from the file protocol.

## Data

${
  options.external
    ? "Component data lives in `data/data.json`. Edit that file to update the dashboard without changing the generated runtime."
    : "Component data is embedded in the generated page. Anyone who can open the dashboard can inspect the data."
}

## Deployment

Deploy the directory to GitHub Pages, Vercel, Netlify or any ordinary static
host. No backend or Numviz installation is required.
`;
}

async function writeDirectory(
  fs: ExportRuntime,
  path: ExportPath,
  output: string,
  config: DashboardConfig,
  externalData: Record<string, unknown> | null,
  runtime: string,
  dataMode: DashboardDataMode
): Promise<DashboardExportResult["files"]> {
  const title = config.title ?? "Numviz dashboard";
  const files: Array<{ path: string; bytes: number }> = [];
  const write = async (relative: string, content: string): Promise<void> => {
    const target = path.join(output, relative);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, content, "utf8");
    files.push({ path: relative, bytes: Buffer.byteLength(content, "utf8") });
  };

  const css = shellCss(config);
  const bootstrap = bootstrapScript(config, externalData !== null);
  const html = pageHtml({
    title,
    css,
    runtime: null,
    bootstrap,
    singleFile: false
  });

  await write("index.html", html);
  await write("assets/styles.css", css);
  await write("assets/dashboard.js", bootstrap);
  await write("assets/numviz/runtime.js", runtime);
  if (externalData !== null) {
    await write(
      "data/data.json",
      serialize({ version: 1, components: externalData }, "data/data.json")
    );
  }
  await write(
    "README.md",
    readme({ title, data: dataMode, external: externalData !== null })
  );
  return files;
}

/**
 * Generate a standalone HTML dashboard. This is intentionally Node-only: it
 * dynamically imports filesystem modules so the core browser bundle never
 * loads Node built-ins.
 */
export async function exportDashboard(
  source: DashboardConfig,
  options: DashboardExportOptions
): Promise<DashboardExportResult> {
  const { format, data } = validateOptions(options);
  let fs: ExportRuntime;
  let path: ExportPath;
  try {
    const [fsModule, pathModule] = await Promise.all([
      import("node:fs/promises"),
      import("node:path")
    ]);
    fs = fsModule as unknown as ExportRuntime;
    path = pathModule as unknown as ExportPath;
  } catch (error) {
    throw new NumvizError(
      "Standalone dashboard export requires Node.js filesystem access.",
      { code: "EXPORT_FAILED", cause: error }
    );
  }

  const output = path.resolve(process.cwd(), options.output);
  const singleFile = [".html", ".htm"].includes(path.extname(output).toLowerCase());
  if (singleFile && data === "external") {
    throw invalid("Single-file dashboards require embedded data.", "data");
  }

  const branded = applyBranding(source, options);
  assertSerializableConfig(branded);
  resolveDashboard(branded);

  let runtime: string;
  try {
    const candidates: Array<string | URL> = [];
    if (RUNTIME_URL.protocol === "file:") candidates.push(RUNTIME_URL);
    candidates.push(path.resolve(process.cwd(), "dist", "standalone", "numviz-runtime.js"));
    let lastError: unknown;
    runtime = "";
    for (const candidate of candidates) {
      try {
        runtime = await fs.readFile(candidate, "utf8");
        break;
      } catch (error) {
        lastError = error;
      }
    }
    if (!runtime) throw lastError ?? new Error("Standalone runtime not found.");
  } catch (error) {
    throw new NumvizError(
      "The standalone runtime is missing. Build Numviz before exporting a dashboard.",
      { code: "EXPORT_FAILED", cause: error }
    );
  }

  const split = data === "external" ? splitExternalData(branded) : null;
  const config = split?.config ?? branded;
  const css = shellCss(config);
  const bootstrap = bootstrapScript(config, split !== null);
  const title = config.title ?? "Numviz dashboard";

  if (singleFile) {
    const html = pageHtml({
      title,
      css,
      runtime,
      bootstrap,
      singleFile: true
    });
    await fs.mkdir(path.dirname(output), { recursive: true });
    await fs.writeFile(output, html, "utf8");
    return {
      format,
      output,
      singleFile: true,
      data,
      files: [{ path: path.basename(output), bytes: Buffer.byteLength(html, "utf8") }]
    };
  }

  const files = await writeDirectory(
    fs,
    path,
    output,
    config,
    split?.data ?? null,
    runtime,
    data
  );
  return { format, output, singleFile: false, data, files };
}
