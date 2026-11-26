# Numviz

Framework-independent JavaScript visualization and dashboard platform. Numviz
renders charts and HTML data tables from ordinary JavaScript data — no React,
Next.js, Numiq, or CSS framework required. React is optional and available from a
separate subpath.

**Current release:** `0.3.0` — the HTML data table engine, on top of the 0.2.x
charts, multi-series data, axis control, legend interactions and responsive
layout.

Published on npm as **`@munachi-me/numviz`**.

## Install

```bash
npm install @munachi-me/numviz
```

Numviz is an ESM-first package with bundled TypeScript declarations. It has no
runtime dependencies.

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

// Later
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

`Numviz.createChart === createChart`, and `Numviz.version` matches the named
`version` export.

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
- **State methods**: `setData`, `setLoading`, `setError`, `setSort`, `setPage`,
  `setSearch`, `setSelection`, `getSelectedRows`, `getState` and `destroy`.
- **Accessibility**: native `table`/`thead`/`tbody`/`th`/`td`, caption, `scope`,
  `aria-sort`, `aria-selected`, `aria-busy`, labelled controls and live status.
- **Safety**: string values and custom renderer strings are inserted as text,
  never as HTML. Return a DOM node from `render` when you need markup.

See [docs/api.md](./docs/api.md#tables) for the complete table API.

## React and Next.js

React support is optional and lives at `@munachi-me/numviz/react`. Install React
alongside Numviz, then use the typed `DataTable` component. The core package
never imports React.

```tsx
import { DataTable } from "@munachi-me/numviz/react";

export function Employees() {
  return <DataTable data={employees} searchable pagination selectable={false} />;
}
```

`sort`, `page`, `search` and `selectedRows` can be supplied for controlled
state, with the matching `onSortChange`, `onPageChange`, `onSearchChange` and
`onSelectionChange` callbacks. See [docs/frameworks.md](./docs/frameworks.md)
for Next.js client boundaries, server rendering and controlled examples.

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
    fontFamily: "Inter, sans-serif",
    borderRadius: 8,
    chartPalette: ["#22D3EE", "#A78BFA", "#34D399"]
  }
});
```

Theme configuration merges over the built-in tokens. Overrides affect only the
chart they are passed to.

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
- `.numviz-table__toolbar`, `.numviz-table__viewport`, `.numviz-table__table`
- `.numviz-table__sort`, `.numviz-table__sort-indicator`
- `.numviz-table__row`, `.numviz-table__row--selected`, `.numviz-table__selection`
- `.numviz-table__empty`, `.numviz-table__loading`, `.numviz-table__error`
- `.numviz-table__footer`, `.numviz-table__pagination`, `.numviz-table__status`

Tables use the same `--nv-*` custom properties as charts.

Marks accept `data-numviz-part`, `data-index` and `data-series` attributes for
custom tooling and tests.

## Accessibility

Charts render `role="img"` SVGs with an accessible name and description. Marks
are focusable, expose `aria-label` values, activate with Enter or Space, and
show the same tooltip on keyboard focus. Legend items expose `aria-pressed`.

Tables use native table semantics with a visually hidden caption, `scope="col"`
headers, `aria-sort` state, `aria-selected` rows, `aria-busy` while loading,
labelled search/page controls and a polite live status region. Motion respects
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
| `DESTROYED` | A destroyed chart is rendered again |

## Examples

The `examples/` folder contains framework-free HTML pages for every chart type
and for the table engine (`table.html`, `table-themes.html`), plus data format
examples:

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
npm run build       # cross-platform clean (scripts/clean.mjs) + tsc
npm run verify      # typecheck, lint, tests, build, consumer import test
```

The build removes `dist/` with `scripts/clean.mjs`, which uses Node's filesystem
API instead of Unix-only shell commands, so it runs on Windows, macOS and Linux.
The consumer test packs the package, installs it into a temporary project and
verifies default imports, named imports, namespace imports, runtime behaviour
and declaration resolution under the published package name.

## Release history

See [CHANGELOG.md](./CHANGELOG.md). Numviz follows pre-1.0 releases: `0.3.0`
adds tables; metrics, dashboards, framework adapters, the complete theme engine,
standalone export and reporting arrive before `1.0.0`.

## License

MIT
