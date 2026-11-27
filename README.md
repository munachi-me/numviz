# Numviz

Framework-independent JavaScript visualization and dashboard platform. Numviz
renders charts, HTML data tables and KPI metric cards from ordinary JavaScript
data — no React, Next.js, Numiq, or CSS framework required. React is optional and
available from a separate subpath.

**Current release:** `1.0.1` — stable charts, tables, metrics, dashboards,
reports, export, printing and React integration for production use.

Published on npm and GitHub Packages as **`@munachi-me/numviz`**.

## Documentation

- [API reference](./docs/api.md)
- [Framework guides](./docs/frameworks.md)
- [Accessibility](./docs/accessibility.md)
- [Migration guide](./docs/migration.md)
- [Troubleshooting](./docs/troubleshooting.md)

## Install

```bash
npm install @munachi-me/numviz
```

Numviz is an ESM-first package with bundled TypeScript declarations. It has no
runtime dependencies.

To install from GitHub Packages, authenticate with a GitHub token that can read
packages and point the scope at the GitHub registry:

```ini
@munachi-me:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

Then run the same install command. GitHub Packages access follows the package's
permissions, so grant read access in package settings if the package is private.
The npm registry remains the default and requires no GitHub authentication.

## Quick start

Both import styles are first-class and share one implementation.

### Named imports

```ts
import { createChart } from "@munachi-me/numviz";

const chart = createChart({
  type: "bar",
  data: [
    { month: "Jan", revenue: 32000 },
    { month: "Feb", revenue: 41000 },
    { month: "Mar", revenue: 38500 }
  ],
  x: "month",
  y: "revenue",
  title: "Monthly revenue"
});

chart.render("#chart");

// Later: update data or options without replacing the instance
chart.update({
  type: "line",
  data: nextMonthRows,
  x: "month",
  y: "revenue"
});

chart.destroy();
```

### Default namespace import

```ts
import Numviz from "@munachi-me/numviz";

const chart = Numviz.createChart({
  type: "line",
  data: [
    { week: "W1", users: 1200 },
    { week: "W2", users: 1450 }
  ],
  x: "week",
  y: "users"
});

chart.render(document.querySelector("#chart"));
```

`Numviz.createChart === createChart`, `Numviz.createTable === createTable`,
`Numviz.createMetric === createMetric`, `Numviz.createDashboard === createDashboard`,
and `Numviz.version` matches the named `version` export. The root entry exports
all four factory functions as named imports and through the frozen default
namespace; the optional React components live only in
`@munachi-me/numviz/react`.

## Chart types

| Type | `type` value | Notes |
| --- | --- | --- |
| Bar | `"bar"` | Vertical bars; grouped when several series are supplied |
| Grouped bar | `"grouped-bar"` | Side-by-side bars per category |
| Stacked bar | `"stacked-bar"` | Series stacked per category |
| Horizontal bar | `"horizontal-bar"` | Categories on the Y axis |
| Line | `"line"` | One or more lines with points and gaps for missing values |
| Area | `"area"` | Lines with translucent filled areas |
| Scatter | `"scatter"` | Numeric or date X against numeric Y |
| Histogram | `"histogram"` | Automatic or configured bins of one value field |
| Radar | `"radar"` | Category spokes with one polygon per series |
| Pie | `"pie"` | Share of total, legend shown by default |
| Doughnut | `"doughnut"` | Pie with an inner radius and centre total |

All charts are SVG-based, responsive, and styled with shared design tokens.

## Data tables

`createTable` renders a real, accessible HTML table with sorting, searching,
pagination, row selection, derived columns and number/date formatting. Only the
visible page is rendered, so large datasets stay fast.

```ts
import { createTable } from "@munachi-me/numviz";

const table = createTable({
  data: employees,
  title: "Employees",
  sortable: true,
  searchable: true,
  pagination: true,
  pageSize: 10,
  rowNumbers: true,
  selectable: true,
  variant: "dashboard",
  columns: [
    { field: "name", label: "Employee", width: 220 },
    { field: "department", label: "Department" },
    { field: "salary", label: "Salary", format: "currency", currency: "USD" },
    { label: "Status", render: (row) => (row.active ? "Active" : "Inactive") },
    { field: "joined", label: "Joined", format: "date" }
  ],
  onSelectionChange: (indices) => console.log(indices)
});

table.render("#table");
```

Column options include `label`, `visible`, `width`, `align`, `format`
(`"text"`, `"number"`, `"currency"`, `"percent"`, `"date"` or a function),
`formatOptions`, `currency`, `render(row, context)`, `value(row)`, `sortable`,
`searchable` and custom classes. Columns without a `field` are computed display
columns; pair `render` with `value` when a computed column must also sort or
search.

- **Features**: automatic detection, column order/visibility/width, sorting,
  search, pagination with page-size selection, row numbering, empty/loading/error
  states, selection, and conditional formatting without replacing the renderer.
- **Variants**: `minimal`, `striped`, `bordered`, `compact` and `dashboard`,
  with light, dark and system themes.
- **Responsive or fixed**: responsive tables stretch to the container and
  scroll horizontally when content is wider; `responsive: false` sizes the
  table to its content and leaves horizontal space to the container.
- **State methods**: `setData`, `setLoading`, `setError`, `setSort`, `setPage`,
  `setSearch`, `setSelection`, `getSelectedRows`, `getState` and `destroy`.
- **Accessibility**: native `table`/`thead`/`tbody`/`th`/`td`, caption, `scope`,
  `aria-sort`, `aria-selected`, `aria-busy`, labelled controls and live status.
- **Safety**: string values and custom renderer strings are inserted as text,
  never as HTML. Return a DOM node from `render` when you need markup.

See [docs/api.md](./docs/api.md#tables) for the complete table API.

## Metrics and KPI cards

`createMetric` computes values without rendering, then renders the same result as
a KPI card. The metric result is a plain JavaScript object.

```ts
import { createMetric } from "@munachi-me/numviz";

const revenue = createMetric({
  name: "Total Revenue",
  data,
  column: "revenue",
  aggregation: "sum",
  format: "currency",
  comparison: {
    data: previousPeriod,
    column: "revenue",
    aggregation: "sum",
    label: "vs previous period"
  }
});

revenue.result.value; // 482000
revenue.result.formattedValue; // "$482,000.00"
revenue.result.comparison?.percentageChange; // 12.6
revenue.result.state; // "positive"

revenue.render("#revenue");
```

- **Aggregations**: `sum`, `average`, `count`, `distinct-count`, `minimum`,
  `maximum`, `median`, `percentage` and custom functions. `avg`, `mean`, `min`,
  `max` and `distinct` are accepted aliases.
- **Filtering**: filter with a callback (`row.values.region === "North"`) or an
  object (`{ region: "North" }`). Missing and invalid values are ignored by
  numeric aggregations and reported in `validCount` / `missingCount`.
- **Percentage**: the share of filtered rows in the full dataset, returned as a
  fraction (`0.4`) and formatted as `40%` by default.
- **Comparisons**: compare against another dataset or a fixed value. Results
  expose `difference`, `percentageChange`, `growth`, `direction` and the
  formatted comparison. Division by zero yields `null` rather than Infinity.
- **KPI rendering**: title, value, description, prefix/suffix, currency and
  percentage formats, trend arrows, comparison values, semantic positive/negative
  states, text or DOM icons, custom colours and `default`, `compact`, `bordered`
  and `highlight` variants. `positiveDirection: "down"` supports lower-is-better
  metrics.
- **Lifecycle**: `setData`, `setLoading`, `setError`, `refresh`, `update` and
  `destroy`, with loading, empty and error appearances.
- **Accessibility**: `role="group"`, a card label, `aria-busy` while loading,
  `role="alert"` for errors and a polite live value.

See [docs/api.md](./docs/api.md#createmetricconfig-metric) for the complete
metric and comparison API.

## Dashboards

`createDashboard` composes independent charts, tables, metrics and content into a
responsive grid. Every component carries its own data; a dashboard never assumes
all widgets share one dataset.

```ts
import { createDashboard } from "@munachi-me/numviz";

const dashboard = createDashboard({
  title: "Sales Analytics",
  description: "Business performance overview",
  format: { locale: "en-US", currency: "USD" },
  layout: {
    columns: { base: 1, sm: 2, lg: 4 },
    gap: 16,
    align: "stretch"
  },
  components: [
    {
      id: "revenue",
      type: "metric",
      name: "Total Revenue",
      data: revenueRows,
      column: "revenue",
      aggregation: "sum",
      format: "currency"
    },
    {
      id: "sales",
      type: "chart",
      chartType: "bar",
      data: monthlyRows,
      x: "month",
      y: "revenue",
      layout: { columnSpan: 2 }
    },
    {
      id: "records",
      type: "table",
      data: employeeRows,
      layout: { columnSpan: 2 }
    }
  ]
});

dashboard.render("#dashboard");
```

- **Components**: `chart`, `table`, `metric`, `heading`, `text`, `description`,
  `divider`, `image` and an explicit safe `custom` component. A custom component
  returns a DOM node, plain text or `null`; returned strings are inserted as
  text, never parsed as HTML.
- **Responsive layout**: configurable columns per `sm`, `md`, `lg` and `xl`
  breakpoint, grid gap, row gap, padding and alignment. Widgets support column
  and row starts, spans, ordering, width, height, minimum sizes and self
  alignment. Column spans are clamped to the active breakpoint, so wide widgets
  do not create implicit columns on narrow screens.
- **Shared presentation, independent state**: dashboard theme tokens flow into
  each widget unless the widget overrides them. Per-widget `style` supports
  background, border, radius, padding, shadow and class overrides. Layout is
  configured separately from visual style.
- **Global formatting**: dashboard `format.locale` and `format.currency` fill in
  metric and table defaults when the widget does not specify them.
- **Lifecycle**: `render`, `update`, `refresh`, `destroy`, `getWidget` and
  `export`. Updates reconcile widgets by id, preserve table state and recompute
  metrics; removed widgets and their engines are destroyed. `refresh()` re-reads
  current component data.
- **Isolation**: each dashboard gets a scoped layout stylesheet keyed to its
  instance, so columns and breakpoints do not leak between dashboards.

See [docs/api.md](./docs/api.md#createdashboardconfig-dashboard) for the complete
dashboard, layout and component API, and open `examples/dashboard.html` or
`examples/dashboard-filters.html`.

## Interactive dashboards

Dashboards can declare filter controls above the grid. A filter targets every
widget that contains its field, or only the widget ids in `targets`.

```ts
const dashboard = createDashboard({
  filters: [
    {
      id: "region",
      type: "select",
      field: "region",
      label: "Region",
      placeholder: "All regions"
    },
    {
      id: "search",
      type: "search",
      field: "account",
      label: "Account"
    },
    {
      id: "revenue",
      type: "number-range",
      field: "revenue",
      label: "Revenue",
      targets: ["total", "records"]
    }
  ],
  components: [
    {
      id: "total",
      type: "metric",
      name: "Total revenue",
      data: rows,
      column: "revenue",
      aggregation: "sum",
      format: "currency"
    },
    {
      id: "chart",
      type: "chart",
      chartType: "bar",
      data: rows,
      x: "region",
      y: "revenue",
      crossFilter: { field: "region" }
    },
    {
      id: "records",
      type: "table",
      data: rows,
      columns: ["region", "account", "revenue"],
      crossFilter: { field: "region" }
    }
  ]
});

dashboard.render("#dashboard");
```

- **Filter types**: `select`, `multi-select`, `search`, `date-range`,
  `number-range` and `custom`. Select options may be supplied explicitly or
  derived from connected component data. Custom filters receive a safe render
  context and may supply a `matches` predicate.
- **Cross-filtering**: add `crossFilter` to a chart or table. Clicking a chart
  mark or selecting table rows filters connected widgets. Use `targets`,
  `includeSelf`, `multi` and `field` to control the connection.
- **Selection**: `chart.setSelectedIndex(index | null)` and
  `dashboard.setSelection(id, indices)` select points or rows.
  `getSelection(id)` returns the current selection.
- **Events**: `dashboard.on("filterchange", listener)`,
  `"selectionchange"`, `"widgetclick"` and `"statechange"` observe interaction.
  `on` returns an unsubscribe function; `off` removes a listener explicitly.
- **State**: `getState()` returns filters, selections, widget visibility and
  serialized cross-filters. `setState(state)` restores a partial state.
  `setFilter`, `clearFilter`, `clearFilters` and `setComponentVisible` update
  state directly.
- **Dynamic data**: `setWidgetData(id, data, columns?)` and
  `updateWidget(id, patch)` replace data or configuration without rebuilding
  the dashboard.

```ts
dashboard.on("filterchange", ({ id, value, filters }) => {
  console.log(id, value, filters);
});

const saved = dashboard.getState();
dashboard.setState(saved);
```

## Standalone dashboard export

`dashboard.export()` writes a finished static dashboard from Node.js. The
generated project carries its own Numviz runtime, so it works without Numviz,
React or a backend installed. Creating a dashboard does not write files; run a
script that calls `export()`:

```ts
import { createDashboard } from "@munachi-me/numviz";

const dashboard = createDashboard({
  title: "Sales Analytics",
  description: "Business performance overview",
  components: [
    {
      id: "revenue",
      type: "metric",
      name: "Total Revenue",
      data: revenueRows,
      column: "revenue",
      aggregation: "sum",
      format: "currency"
    },
    {
      id: "sales",
      type: "chart",
      chartType: "bar",
      data: monthlyRows,
      x: "month",
      y: "revenue"
    },
    { id: "records", type: "table", data: employeeRows, searchable: true }
  ]
});

await dashboard.export({
  format: "html",
  output: "./dashboard",
  data: "embedded"
});
```

Run the script with `npx tsx export-dashboard.ts`, or compile it and run the
result with Node.js. See `examples/standalone-export.mjs` for a runnable
example. A directory export contains:

```text
dashboard/
├── index.html
├── assets/
│   ├── styles.css
│   ├── dashboard.js
│   └── numviz/runtime.js
├── data/data.json        # external data mode
└── README.md
```

- **Data modes**: `data: "embedded"` (default) writes component data into the
  page. `data: "external"` writes `data/data.json` and loads it at runtime;
  serve the directory over HTTP because browsers block local JSON requests from
  `file://`.
- **Single file**: pass an output ending in `.html` to generate one portable
  file. Single-file output requires embedded data.
- **Customisation**: `title`, `description`, `logo`, `theme`, `fontFamily`,
  `background`, `layout`, `header` and `footer` override the generated page.
- **Limits**: custom dashboard components and custom filters contain render
  functions and cannot be serialized. Standalone export is Node-only; `export()`
  rejects in browsers with an `EXPORT_FAILED` error. Built-in filters,
  cross-filtering, chart/table interactions and dashboard state keep working.
- **Printing**: generated pages include print styles that hide filter controls
  and table toolbars, keep widgets together where possible, and set a 12 mm page
  margin.
- **Security**: data is serialized with `<` escaped inside generated scripts, and
  table HTML exports escape every value. Treat imported datasets as untrusted
  input and review them before sharing a dashboard.
- **Deployment**: copy the directory to GitHub Pages, Vercel, Netlify or any
  static host. No server runtime is required.

## Chart, table and report exports

Charts export as standalone SVG or browser PNG. Tables export filtered and
sorted rows as CSV, JSON or an HTML table.

```ts
chart.render("#chart");
const svg = chart.toSVG({ width: 1200, height: 720 });
const png = await chart.toPNG({ scale: 2 });

const table = createTable({
  data: rows,
  columns: [{ field: "region", label: "Region" }, { field: "revenue", format: "currency" }]
});
const csv = table.toCSV();
const json = table.toJSON({ useLabels: true, pretty: true });
const html = table.toHTML({ includeTitle: true });
```

- **Chart SVG**: `toSVG()` returns a portable SVG with inline theme tokens and
  chart styles. `toPNG()` uses the browser image and canvas APIs and rejects
  with `EXPORT_FAILED` where canvas is unavailable.
- **Table scope**: exports include every filtered and sorted row by default.
  Pass `scope: "page"` for the current page and `includeHidden: true` to include
  hidden columns.
- **Table formatting**: CSV and JSON use displayed labels and cell formatting by
  default. Use `raw: true` for unformatted JSON values.
- **CSV security**: formula starters (`=`, `+`, `-`, `@`, tab, carriage return and
  line feed) are prefixed with `'` by default, including after leading
  whitespace or control characters. Genuine negative numbers keep their numeric
  presentation. Set `formulaProtection: false` only for trusted,
  non-spreadsheet consumers; the apostrophe is part of the CSV payload and may
  be visible to parsers that do not implement spreadsheet text markers.

Reports wrap dashboards with reusable layouts and print defaults:

```ts
import { createReport } from "@munachi-me/numviz";

const report = createReport({
  type: "executive",
  metadata: { title: "Q4 review", author: "Finance" },
  components: [
    { id: "revenue", type: "metric", name: "Revenue", data: rows, column: "revenue", aggregation: "sum" },
    { id: "trend", type: "chart", chartType: "line", data: rows, x: "month", y: "revenue" }
  ]
});

report.render("#report");
report.print();
await report.export({ output: "./q4-report" });
```

Built-in report types are `executive`, `analytical`, `kpi`, `table`, `charts`
and `dashboard`. `createReport()` is also available as
`Numviz.createReport()`. Use `dashboard.print()` or `report.print()` to open the
browser print dialog, and `print: false` to disable print helpers.

## React and Next.js

React support is optional and lives at `@munachi-me/numviz/react`. Install React
alongside Numviz, then use the typed `Chart`, `Dashboard`, `DashboardWidget`,
`DataTable` and `Metric` components. The core package never imports React.

```tsx
import { Chart } from "@munachi-me/numviz/react";

export function RevenueChart({ rows }: { rows: Record<string, unknown>[] }) {
  return <Chart type="bar" data={rows} x="month" y="revenue" title="Revenue" />;
}
```

`Chart` recreates nothing when a parent re-renders with equal data. When props
change, it updates the existing chart in place.

```tsx
import { Dashboard, DashboardWidget } from "@munachi-me/numviz/react";

export function Overview() {
  return (
    <Dashboard title="Sales Analytics" layout={{ columns: { base: 1, md: 2 } }}>
      <DashboardWidget
        id="revenue"
        type="metric"
        name="Total Revenue"
        data={revenueRows}
        column="revenue"
        aggregation="sum"
      />
      <DashboardWidget
        id="sales"
        type="chart"
        chartType="bar"
        data={monthlyRows}
        x="month"
        y="revenue"
      />
    </Dashboard>
  );
}
```

`Dashboard` also accepts a `components` array. `DashboardWidget` can be used on
its own to render one dashboard widget without the full dashboard wrapper.

```tsx
import { DataTable } from "@munachi-me/numviz/react";

export function Employees() {
  return <DataTable data={employees} searchable pagination selectable={false} />;
}
```

`sort`, `page`, `search` and `selectedRows` can be supplied for controlled
state, with the matching `onSortChange`, `onPageChange`, `onSearchChange` and
`onSelectionChange` callbacks.

```tsx
import { Metric } from "@munachi-me/numviz/react";

<Metric
  name="Total Revenue"
  data={rows}
  column="revenue"
  aggregation="sum"
  format="currency"
  comparison={{ value: 400000 }}
/>;
```

Light, dark, system and custom themes work across every component. The `colors`
object provides friendly aliases for the token names.

```ts
const theme = {
  mode: "dark",
  colors: {
    primary: "#7057D9",
    background: "#111318",
    surface: "#1B1E26",
    text: "#FFFFFF"
  }
};

createChart({ type: "bar", data, x: "month", y: "revenue", theme });
```

See [docs/frameworks.md](./docs/frameworks.md) for Next.js client boundaries,
server rendering, dashboard composition, controlled tables and metric examples.

## Multi-series data

```ts
createChart({
  type: "grouped-bar",
  data: [
    { month: "Jan", revenue: 32000, expenses: 21000 },
    { month: "Feb", revenue: 41000, expenses: 24000 },
    { month: "Mar", revenue: 38500, expenses: 22500 }
  ],
  x: "month",
  y: "revenue",
  series: [
    { field: "revenue", label: "Revenue", color: "#6366F1" },
    { field: "expenses", label: "Expenses", color: "#F59E0B" }
  ],
  legend: { position: "top" }
});
```

When `series` is omitted, Numviz creates one series from `y`. Line, area,
scatter, radar, bar, grouped-bar and stacked-bar support multiple series.

## Data formats

Numviz accepts three input shapes and never mutates them.

### Arrays of objects

```ts
createChart({
  type: "bar",
  data: [
    { month: "Jan", revenue: 32000 },
    { month: "Feb", revenue: "41000" } // numeric strings are normalized
  ],
  x: "month",
  y: "revenue"
});
```

### Arrays of arrays with columns

```ts
createChart({
  type: "line",
  data: [
    ["Jan", 1200],
    ["Feb", 1450]
  ],
  columns: [
    { key: "month", label: "Month" },
    { key: "users", label: "Users", type: "number" }
  ],
  x: "month",
  y: "users"
});
```

### Numiq-compatible datasets

Numviz consumes the public dataset shape `{ columns, rows }` or `{ columns, data }`.
It does not depend on Numiq internals.

```ts
const dataset = {
  columns: [
    { key: "region", label: "Region" },
    { key: "orders", label: "Orders", type: "number" }
  ],
  rows: [
    ["North", 1240],
    ["South", 980]
  ]
};

createChart({ type: "bar", data: dataset, x: "region", y: "orders" });
```

### Normalization rules

- Empty strings, `null`, `undefined` and missing fields become `null`.
- Numeric strings become numbers. A column is numeric when all values are
  numeric, or when at least two thirds are numeric (a minority of invalid
  entries then becomes `null`).
- ISO date strings become `Date` values. Other strings stay strings.
- `"true"`/`"false"` and booleans become booleans.
- Mixed columns are converted to strings.
- Duplicate or missing column keys raise a `NumvizError`.

Declared columns are always preserved. When `columns` is supplied for object or
dataset records, those columns keep their declared order and appear in the
normalized dataset even if no record contains them; their cells are `null`.
Record keys that were not declared are appended after the declared columns.

For array-of-arrays data, each row may be shorter than the column list: missing
cells become `null`. A row that is longer than the column list raises
`INVALID_DATA` (`details: { row, expected, received }`) instead of silently
discarding the extra values.

Invalid values do not crash rendering; they are skipped. When no values remain,
the chart renders an empty state.

## Chart options

| Option | Type | Description |
| --- | --- | --- |
| `type` | `ChartType` | Required chart type |
| `data` | `DataInput` | Required input data |
| `x` | `string` | Category / X field (alias: `category`) |
| `y` | `string` | Numeric value field (alias: `value`) |
| `series` | `SeriesConfig[]` | Series definitions with `field`, `label`, `color` |
| `columns` | `ColumnInput[]` | Column definitions for array-of-arrays data |
| `title` / `subtitle` | `string` | Header text rendered inside the chart |
| `width` / `height` | `number` | ViewBox size (default: container width × 380) |
| `palette` | `string[]` | Series/pie colours (defaults follow the theme) |
| `background` | `string` | Chart background colour override |
| `legend` | `boolean \| { show, position, interactive }` | `position`: `top`, `right`, `bottom`, `left` |
| `labels` | `boolean \| { show, position, formatter }` | `position`: `auto`, `inside`, `outside` |
| `tooltip` | `boolean \| { show, formatter }` | Hover, focus and touch tooltips |
| `margin` | `number \| Partial<MarginConfig>` | Plot margins |
| `theme` | `ThemeConfig` | Design token overrides |
| `xAxis` / `yAxis` | `AxisConfig` | Titles, ticks, grid, rotation, bounds |
| `bins` | `number` | Histogram bin count (1–200) |
| `responsive` | `boolean` | Follow container width (default `true`) |
| `animation` | `boolean \| { enabled, duration }` | Mark fade-in, reduced-motion aware |
| `onClick` | `(event) => void` | Click and keyboard activation on marks |
| `ariaLabel` | `string` | Accessible name for the SVG |

### Axis configuration

```ts
createChart({
  type: "bar",
  data,
  x: "month",
  y: "revenue",
  xAxis: {
    title: "Month",
    rotate: 45,
    grid: false,
    tickFormat: (value) => String(value).toUpperCase()
  },
  yAxis: {
    title: "Revenue",
    min: 0,
    max: 100000,
    grid: true,
    tickFormat: (value) => `$${Number(value).toLocaleString()}`
  }
});
```

Axes support `title`, `show`, `grid`, `rotate` (−90 to 90), `tickFormat`,
`min` and `max`. Category axes ignore `min`/`max`.

## Interactions

- Tooltips follow the pointer, keyboard focus and touch.
- Hovering or focusing a mark highlights its category or series and dims the rest.
- Legends toggle series visibility by click, Enter or Space.
- `chart.setSeriesVisible(index, visible)` mirrors legend behaviour from code.
- `chart.setSelectedIndex(index | null)` selects a point or category and
  `chart.getSelectedIndex()` reads it back.
- `chart.getSummary()` returns a plain-text description for assistive
  technology, tests and exports.
- `onClick` receives `{ type, label, field, series, value, index, originalEvent }`.

```ts
createChart({
  type: "grouped-bar",
  data,
  x: "month",
  y: "revenue",
  series: [
    { field: "revenue", label: "Revenue" },
    { field: "expenses", label: "Expenses" }
  ],
  onClick: ({ label, series, value }) => {
    console.log(`${series} for ${label}: ${value}`);
  }
});
```

## Responsive layout

When `width` is omitted and `responsive` is true (the default), Numviz measures
the render container, uses that width, and re-renders when the container
resizes. Set an explicit `width` to opt out of measured layout.

## Iframes and multiple documents

Rendering uses the target element's own document and window. Charts render into
iframes, use the iframe's `ResizeObserver` and `requestAnimationFrame`, and
evaluate `theme.mode: "system"` with the iframe window's
`prefers-color-scheme`. Structural styles are injected into the target
document, not the parent page.

```ts
const frame = document.querySelector("iframe");
const chart = createChart({ type: "bar", data, x: "month", y: "revenue" });
chart.render(frame.contentDocument.querySelector("#chart"));
```

String selectors resolve against the global document. Pass an element when the
target lives in another document.

## Theming

The default theme is neutral and readable, with a restrained indigo accent.
`light`, `dark` and `system` modes are supported.

```ts
createChart({
  type: "bar",
  data,
  x: "month",
  y: "revenue",
  theme: {
    mode: "dark",
    accent: "#22D3EE",
    surfaceElevated: "#152033",
    positive: "#34D399",
    warning: "#FBBF24",
    danger: "#F87171",
    info: "#38BDF8",
    fontFamily: "Inter, sans-serif",
    borderRadius: 8,
    chartPalette: ["#22D3EE", "#A78BFA", "#34D399"]
  }
});
```

All documented tokens are configurable: `background`, `surface`,
`surfaceElevated`, `text`, `mutedText`, `border`, `grid`, `accent`, `positive`,
`warning`, `danger`, `info`, `fontFamily`, `borderRadius` and `chartPalette`.
Theme configuration merges over the built-in tokens. Overrides affect only the
chart or table they are passed to.

## Styling hooks

Every chart root exposes CSS custom properties (`--nv-background`,
`--nv-surface`, `--nv-text`, `--nv-muted-text`, `--nv-border`, `--nv-grid`,
`--nv-accent`, `--nv-font-family`, `--nv-radius`, `--nv-animation-duration`,
semantic state colours) and documented class names:

- `.numviz-root` — chart container
- `.numviz-chart__svg` — SVG element
- `.numviz-chart__title`, `.numviz-chart__subtitle`
- `.numviz-chart__tick-label`, `.numviz-chart__axis-line`, `.numviz-chart__grid-line`
- `.numviz-chart__axis-title`
- `.numviz-chart__mark`, `.numviz-chart__mark--dimmed`, `.numviz-chart__value-label`
- `.numviz-legend`, `.numviz-legend__item`, `.numviz-legend__swatch`
- `.numviz-tooltip`, `.numviz-tooltip__label`, `.numviz-tooltip__value`
- `.numviz-table`, `.numviz-table--minimal`, `.numviz-table--striped`,
  `.numviz-table--bordered`, `.numviz-table--compact`, `.numviz-table--dashboard`
- `.numviz-table--responsive`, `.numviz-table--fixed`
- `.numviz-table__toolbar`, `.numviz-table__viewport`, `.numviz-table__table`
- `.numviz-table__sort`, `.numviz-table__sort-indicator`
- `.numviz-table__row`, `.numviz-table__row--selected`, `.numviz-table__selection`
- `.numviz-table__empty`, `.numviz-table__loading`, `.numviz-table__error`
- `.numviz-table__footer`, `.numviz-table__pagination`, `.numviz-table__status`
- `.numviz-metric`, `.numviz-metric--default`, `.numviz-metric--compact`,
  `.numviz-metric--bordered`, `.numviz-metric--highlight`
- `.numviz-metric__header`, `.numviz-metric__icon`, `.numviz-metric__title`,
  `.numviz-metric__value-row`, `.numviz-metric__value`
- `.numviz-metric__prefix`, `.numviz-metric__suffix`, `.numviz-metric__empty`
- `.numviz-metric__description`, `.numviz-metric__comparison`,
  `.numviz-metric__trend`, `.numviz-metric__change`
- `.numviz-metric__error`

Tables and metrics use the same `--nv-*` custom properties as charts. Metrics
also honour `--nv-metric-accent` when a card sets `color`.

Marks accept `data-numviz-part`, `data-index` and `data-series` attributes for
custom tooling and tests.

## Accessibility

Charts render `role="img"` SVGs with an accessible name and description. Marks
are focusable, expose `aria-label` values, activate with Enter or Space, and
show the same tooltip on keyboard focus. Legend items expose `aria-pressed`.

Tables use native table semantics with a visually hidden caption, `scope="col"`
headers, `aria-sort` state, `aria-selected` rows, `aria-busy` while loading,
labelled search/page controls and a polite live status region.

Metric cards expose `role="group"` with an accessible label, `aria-busy` while
loading, a polite live value and `role="alert"` error messages. Motion respects
`prefers-reduced-motion` and can be disabled.

## Errors

Errors are `NumvizError` instances with a `code` and optional `path`.

| Code | Raised when |
| --- | --- |
| `INVALID_CONFIG` | A configuration value is missing or malformed |
| `INVALID_TYPE` | The chart type is unsupported |
| `INVALID_DATA` | Data shape or a value column is invalid |
| `INVALID_CONTAINER` | The render target is not a selector or element |
| `CONTAINER_NOT_FOUND` | No element matches the selector |
| `NO_DOM` | Rendering was attempted without a DOM |
| `DESTROYED` | A destroyed chart is rendered or updated again |
| `EXPORT_FAILED` | An export or print operation is unavailable or fails |

## Examples

The `examples/` folder contains framework-free HTML pages for every chart type,
in-place chart updates and theme colours (`chart-updates.html`), the table engine
(`table.html`, `table-themes.html`), KPI metrics (`metrics.html`), dashboard
composition (`dashboard.html`), interactive dashboards
(`dashboard-filters.html`) and exportable reports (`report.html`), plus data
format examples:

```bash
npm install
npm run build
npx serve .
# open http://localhost:3000/examples/
```

## Development

```bash
npm run typecheck   # strict TypeScript
npm run lint        # ESLint
npm test            # Vitest in jsdom
npm run build       # clean, tsc and self-contained standalone runtime
npm run verify      # typecheck, lint, tests, build, consumer import test
```

The build removes `dist/` with `scripts/clean.mjs`, which uses Node's filesystem
API instead of Unix-only shell commands, so it runs on Windows, macOS and Linux.
The consumer test packs the package, installs it into a temporary project with
React, and verifies named, default and namespace imports, chart/table/metric/
dashboard runtime behaviour, root declaration resolution and the separate React
subpath. It also server-renders `Dashboard`, `DataTable` and `Metric` and
confirms that no core build file imports React.

## Publishing

Publishing is automated by `.github/workflows/publish.yml`. Publishing a GitHub
release runs the full verification suite, then publishes to both npm and GitHub
Packages. Stable releases use the `latest` tag and prereleases use `next`; npm
publishes also carry provenance. Manual runs default to a safe dry run and can
publish to `latest` or `next` explicitly.

The workflow uses `NPM_TOKEN` for npm because trusted publishing is not
configured for this package. npm provenance still uses GitHub OIDC through
`id-token: write`. GitHub Packages uses the workflow `GITHUB_TOKEN` with
`packages: write`. To migrate to npm trusted publishing, configure the package's
trusted publisher for this repository and workflow, then remove `NPM_TOKEN`.

The workflow checks both registries before publishing, refuses to overwrite an
existing version, verifies the published version and dist-tag after publication,
and fails if either registry does not confirm the release. A dry run never
publishes.

## Release history

See [CHANGELOG.md](./CHANGELOG.md). `1.0.1` is a maintenance release with CSV
formula injection protection and hardened npm/GitHub Packages publication
verification. Charts, tables, metrics, dashboards, reports, export, printing and
React integration remain backward compatible.

## License

MIT
