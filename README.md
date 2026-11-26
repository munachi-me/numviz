# Numviz

Framework-independent JavaScript visualization and dashboard platform. Numviz
renders charts from ordinary JavaScript data — no React, Next.js, Numiq, or CSS
framework required.

**Current release:** `0.1.0` — core foundation with bar, line, pie and doughnut
charts.

## Install

```bash
npm install numviz
```

Numviz is an ESM-first package with bundled TypeScript declarations. It has no
runtime dependencies.

## Quick start

Both import styles are first-class and share one implementation.

### Named imports

```ts
import { createChart } from "numviz";

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
import Numviz from "numviz";

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
| Bar | `"bar"` | Categorical X axis, linear Y axis, hover/focus tooltips |
| Line | `"line"` | Trend line with points, gaps where values are missing |
| Pie | `"pie"` | Share of total, legend shown by default |
| Doughnut | `"doughnut"` | Pie with an inner radius and centre total |

All charts are SVG-based, responsive to their container width, and styled with
shared design tokens.

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

Invalid values do not crash rendering; they are skipped. When no values remain,
the chart renders an empty state.

## Chart options

| Option | Type | Description |
| --- | --- | --- |
| `type` | `"bar" \| "line" \| "pie" \| "doughnut"` | Required chart type |
| `data` | `DataInput` | Required input data |
| `x` | `string` | Category field (alias: `category`) |
| `y` | `string` | Numeric value field (alias: `value`) |
| `columns` | `ColumnInput[]` | Column definitions for array-of-arrays data |
| `title` / `subtitle` | `string` | Header text rendered inside the chart |
| `width` / `height` | `number` | ViewBox size in pixels (defaults: 720 × 380) |
| `palette` | `string[]` | Series/pie colours (defaults follow the theme) |
| `background` | `string` | Chart background colour override |
| `legend` | `boolean \| { show, position }` | `position`: `top`, `right`, `bottom`, `left` |
| `labels` | `boolean \| { show, formatter }` | Data labels on marks |
| `tooltip` | `boolean \| { show, formatter }` | Hover, focus and touch tooltips |
| `margin` | `number \| Partial<MarginConfig>` | Plot margins |
| `theme` | `ThemeConfig` | Design token overrides |
| `ariaLabel` | `string` | Accessible name for the SVG |

`formatter` for labels receives `(value, label)`; the tooltip formatter receives
`(value, { label, field, index })`.

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
`--nv-accent`, `--nv-font-family`, `--nv-radius`, semantic state colours) and
documented class names:

- `.numviz-root` — chart container
- `.numviz-chart__svg` — SVG element
- `.numviz-chart__title`, `.numviz-chart__subtitle`
- `.numviz-chart__tick-label`, `.numviz-chart__axis-line`, `.numviz-chart__grid-line`
- `.numviz-chart__mark`, `.numviz-chart__value-label`
- `.numviz-legend`, `.numviz-legend__item`, `.numviz-legend__swatch`
- `.numviz-tooltip`, `.numviz-tooltip__label`, `.numviz-tooltip__value`

## Accessibility

Charts render `role="img"` SVGs with an accessible name and description. Marks
are focusable, expose `aria-label` values, and show the same tooltip on keyboard
focus. Motion respects `prefers-reduced-motion`.

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

The `examples/` folder contains framework-free HTML pages for each chart type
and data format:

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
npm run build       # ESM output + declarations in dist/
npm run verify      # typecheck, lint, tests, build, consumer import test
```

The consumer test packs the package, installs it into a temporary project and
verifies default imports, named imports, namespace imports, runtime behaviour
and declaration resolution.

## Roadmap

The release roadmap lives in
[`numviz-development-roadmap-and-release-prompts-updated.md`](./numviz-development-roadmap-and-release-prompts-updated.md).
`0.1.0` covers the core foundation; advanced charts, tables, metrics,
dashboards, framework adapters, themes, standalone export and reporting follow in
later releases.

## License

MIT
