# Numviz API reference — 0.4.1

## Entry points

```ts
import Numviz from "@munachi-me/numviz";              // default namespace
import { createChart, createTable, createMetric } from "@munachi-me/numviz";
import { DataTable, Metric } from "@munachi-me/numviz/react"; // optional React entry
```

The default namespace is frozen and contains `createChart`, `createTable`,
`createMetric`, `version` and `NumvizError`. Named and default imports reference
the same function implementations. The React subpath is a separate optional
entry and is the only module that imports React.

Type exports include `Chart`, `ChartConfig`, `ChartType`, `ChartClickEvent`,
`DataInput`, `DataRecord`, `DataMatrixRow`, `DatasetLike`, `ColumnInput`,
`ColumnDefinition`, `ColumnType`, `SeriesConfig`, `ResolvedSeries`,
`AxisConfig`, `ResolvedAxis`, `TickValue`, `AnimationConfig`, `LabelConfig`,
`LabelPosition`, `LegendConfig`, `LegendPosition`, `TooltipConfig`,
`TooltipContext`, `ValueFormatter`, `MarginConfig`, `NormalizedDataset`,
`NormalizedRow`, `NormalizedColumn`, `NormalizedValue`, `ResolvedChartConfig`,
`ThemeConfig`, `ThemeTokens`, `ThemeMode`, `NumvizErrorCode`,
`NumvizErrorOptions`, `Table`, `TableConfig`, `TableColumnConfig`, `TableRow`,
`TableAlign`, `TableVariant`, `TableFormatPreset`, `TableFormatter`,
`TableCellRenderer`, `TableCellContext`, `TableSortState`,
`TableSortDirection`, `TableState`, `TableData`, `ResolvedTableConfig`,
`ResolvedTableColumn`, `Metric`, `MetricConfig`, `MetricResult`,
`MetricAggregation`, `MetricAggregationAlias`, `MetricAggregationName`, `MetricAggregator`,
`MetricComparisonConfig`, `MetricComparisonResult`, `MetricContext`,
`MetricDirection`, `MetricFilter`, `MetricRowFilter`, `MetricRowContext`,
`MetricFormat`, `MetricFormatPreset`, `MetricFormatContext`,
`MetricFormatter`, `MetricIcon`, `MetricState`, `MetricTrend` and
`MetricVariant`.

## `createChart(config): Chart`

Validates the configuration, normalizes data and returns a chart instance.
Validation happens immediately; rendering happens in `render()`.

### ChartConfig

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| `type` | `ChartType` | required | Chart type |
| `data` | `DataInput` | required | Source data |
| `x` | `string` | required except histogram | Category / X field; alias `category` |
| `y` | `string` | required | Numeric value field; alias `value` |
| `series` | `SeriesConfig[]` | `[y]` | Series definitions |
| `columns` | `ColumnInput[]` | — | Column definitions for array-of-arrays data |
| `title` | `string` | — | Chart title |
| `subtitle` | `string` | — | Chart subtitle |
| `width` | `number` | container width | SVG viewBox width |
| `height` | `number` | `380` | SVG viewBox height |
| `palette` | `string[]` | theme palette | Mark colours, cycled |
| `background` | `string` | theme background | Background override |
| `legend` | `boolean \| LegendConfig` | multi-series / pie | Legend display |
| `labels` | `boolean \| LabelConfig` | `false` | Data labels |
| `tooltip` | `boolean \| TooltipConfig` | `true` | Tooltips |
| `margin` | `number \| Partial<MarginConfig>` | `16/20/44/56` | Plot margins |
| `theme` | `ThemeConfig` | light | Token overrides |
| `xAxis` / `yAxis` | `AxisConfig` | — | Axis options |
| `bins` | `number` | Sturges-like | Histogram bins (1–200) |
| `responsive` | `boolean` | `true` | Measure and follow the container |
| `animation` | `boolean \| AnimationConfig` | enabled, 240 ms | Mark fade-in |
| `onClick` | `(event: ChartClickEvent) => void` | — | Mark activation |
| `ariaLabel` | `string` | title or description | SVG accessible name |

### ChartType

`"bar" | "grouped-bar" | "stacked-bar" | "horizontal-bar" | "line" | "area" |
"scatter" | "histogram" | "radar" | "pie" | "doughnut"`

### SeriesConfig

```ts
interface SeriesConfig {
  field: string;   // numeric column
  label?: string;  // legend and tooltip label
  color?: string;  // CSS colour, defaults to the palette
}
```

Series fields must be unique and numeric. Unknown or non-numeric fields throw
`INVALID_CONFIG` / `INVALID_DATA` with the available fields.

### Chart instance

| Member | Description |
| --- | --- |
| `config` | Resolved configuration |
| `data` | Normalized, read-only dataset |
| `element` | Rendered root element or `null` |
| `isDestroyed` | Lifecycle flag |
| `render(target)` | Render into a selector or element; returns the chart |
| `setSeriesVisible(index, visible)` | Toggle a series like a legend click |
| `destroy()` | Remove output, listeners and mark the chart destroyed |

Calling `render()` again removes previous output. Rendering a destroyed chart
throws `DESTROYED`.

## `createTable(config): Table`

Renders a native HTML table. Data normalization matches charts (records,
array-of-arrays with `columns`, or a `{ columns, rows }` dataset). Declared
columns are preserved; missing cells become `null`; rows longer than the
declared columns throw `INVALID_DATA`.

```ts
import { createTable } from "@munachi-me/numviz";

const table = createTable({
  data: [
    { name: "Ada", department: "Engineering", salary: 145000, joined: "2019-07-15" }
  ],
  columns: [
    { field: "name", label: "Employee" },
    { field: "salary", format: "currency", currency: "USD" },
    { field: "joined", format: "date" },
    { label: "Status", render: (row) => (row.active ? "Active" : "Inactive") }
  ]
}).render("#table");
```

### Table configuration

| Option | Default | Description |
| --- | --- | --- |
| `data` | required | Records, matrix with `columns`, or dataset input |
| `columns` | auto-detected | Field names or column objects |
| `sortable` | `true` | Enables header sorting |
| `defaultSort` | `null` | `{ field, direction?: "asc" \| "desc" }` |
| `onSortChange` | — | Receives the next sort state or `null` |
| `searchable` | `false` | Shows the search input |
| `searchPlaceholder` | `"Search…"` | Search input placeholder |
| `onSearchChange` | — | Receives the query |
| `pagination` | `false` | Shows footer pagination controls |
| `pageSize` | `10` | Rows per page |
| `pageSizeOptions` | `[10, 25, 50, 100]` | Page-size selector options |
| `onPageChange` | — | Receives the new page |
| `rowNumbers` | `false` | Adds a row-number column |
| `selectable` | `false` | Adds checkboxes and row selection |
| `selectedRows` | `[]` | Initial selected row indices |
| `onSelectionChange` | — | Receives selected indices and rows |
| `loading` / `setLoading` | `false` | Loading state and message |
| `error` / `setError` | `null` | Error message and retry styling |
| `emptyMessage` | `"No data to display"` | Empty state text |
| `noResultsMessage` | `"No matching rows"` | Search with no matches |
| `variant` | `"minimal"` | `minimal`, `striped`, `bordered`, `compact`, `dashboard` |
| `striped` | `false` | Adds zebra striping to any variant |
| `stickyHeader` | `true` | Sticky header inside the scroll viewport |
| `maxHeight` | — | Max viewport height (number in px or CSS length) |
| `locale` | `"en-US"` | Locale for number and date formatting |
| `theme` | `{}` | Same theme tokens as charts |
| `className` | — | Extra class on the table root |
| `title` | — | Heading above the table |
| `caption` | — | Accessible caption text |
| `ariaLabel` | — | Overrides the table accessible name |
| `responsive` | `true` | `true`: stretch to the container and scroll horizontally when needed. `false`: size to content with no horizontal scrolling |

### Table columns

| Field | Description |
| --- | --- |
| `field` / `key` | Data field. Optional for render-only computed columns |
| `label` | Header text |
| `visible` | Hides the column when `false` |
| `width` | Number (px) or CSS length |
| `align` | `"left"`, `"center"`, `"right"`; numbers default to right |
| `type` | `"string"`, `"number"`, `"date"`, `"boolean"` |
| `format` | Preset (`text`, `number`, `currency`, `percent`, `date`) or `(value, row, column) => string` |
| `formatOptions` | `Intl.NumberFormat` / `Intl.DateTimeFormat` options |
| `currency` | ISO currency for the currency preset (default `USD`) |
| `render` | `(row, { rowIndex, row, column }) => Node \| string \| number` |
| `value` | `(row) => unknown` accessor for computed columns used in sorting/search |
| `sortable` / `searchable` | Per-column overrides |
| `className` / `headerClassName` | Custom classes |

String values and string render results are inserted as text, never as HTML.
Return a DOM node from `render` to add markup.

### Table methods

| Method | Description |
| --- | --- |
| `render(target)` | Renders into a selector or element; uses the target document |
| `update(config)` | Re-resolves configuration and data, keeping state where valid |
| `setData(data, columns?)` | Replaces data (and optionally columns) |
| `setLoading(bool)` | Toggles the loading state |
| `setError(string \| null)` | Shows or clears an error row |
| `setSort(field, direction?, emit?)` | Sets or clears sorting by field |
| `setPage(page, emit?)` | Sets the 1-based page, clamped to the page count |
| `setSearch(query, emit?)` | Sets the query and resets to page 1 |
| `setSelection(indices, emit?)` | Sets selected row indices |
| `getSelectedRows()` | Returns selected row objects |
| `getState()` | Sort, page, page count, query, selection and counts |
| `destroy()` | Removes output and listeners |

Only the current page is rendered when `pagination` is enabled; with pagination
disabled every filtered and sorted row is rendered and `getState().pageCount`
is `1`. Sorting, filtering and selection operate on the normalized row list, so
pagination never creates a DOM row per record.

## `createMetric(config): Metric`

Computes a value immediately, without a DOM. `result` is a plain object, so
metrics can be used for calculations, exports or server-side summaries even when
they are never rendered.

```ts
import { createMetric } from "@munachi-me/numviz";

const revenue = createMetric({
  name: "Total Revenue",
  data,
  column: "revenue",
  aggregation: "sum",
  format: "currency",
  comparison: { data: previous, column: "revenue" }
});

revenue.result.value; // 1000
revenue.result.comparison?.percentageChange; // 25
revenue.render("#revenue");
```

### MetricConfig

| Property | Default | Description |
| --- | --- | --- |
| `name` | required | Metric name and accessible card label |
| `title` | `name` | Visible card title |
| `data` | required | Records, matrix with `columns`, or dataset input |
| `columns` | inferred | Column definitions for matrix or dataset input |
| `column` | — | Field to aggregate; required by numeric and distinct aggregations |
| `aggregation` | `"sum"` | Built-in name or custom function |
| `filter` | — | Callback or exact-match object applied before aggregation |
| `description` | — | Supporting text under the value |
| `format` | aggregation default | `number`, `currency`, `percent`, `compact` or a function |
| `formatOptions` | — | `Intl.NumberFormat` options |
| `locale` | `"en-US"` | Number and date locale |
| `currency` | `"USD"` | Currency for the currency preset and comparison |
| `prefix` / `suffix` | — | Text rendered around the value |
| `comparison` | — | Previous dataset or fixed previous value |
| `trend` | `"auto"` | `auto`, `up`, `down`, `flat` or `false` |
| `positiveDirection` | `"up"` | Which direction counts as positive; use `"down"` for churn, cost or error rates |
| `icon` | — | Text glyph/emoji or a DOM node |
| `color` | — | Accent used by the value and highlight variant (`--nv-metric-accent`) |
| `variant` | `"default"` | `default`, `compact`, `bordered`, `highlight` |
| `theme` | `{}` | Same theme tokens as charts and tables |
| `className` | — | Extra class on the card root |
| `loading` | `false` | Loading appearance |
| `error` | `null` | Error message shown with `role="alert"` |
| `emptyMessage` | `"No data"` | Value replacement when the metric is empty |
| `ariaLabel` | `title` | Accessible card label |

### Aggregations

| Name | Result |
| --- | --- |
| `sum` | Total of finite numeric values |
| `average` | Mean of finite numeric values (`avg`, `mean` aliases) |
| `count` | Number of rows after filtering |
| `distinct-count` | Number of distinct non-null column values (`distinct` alias) |
| `minimum` / `maximum` | Smallest/largest numeric value (`min`, `max` aliases) |
| `median` | Median of numeric values |
| `percentage` | Filtered rows ÷ all rows, as a fraction; formatted as a percent by default |
| custom function | Receives `{ rows, values, column, totalRowCount, matchedRowCount, dataset }` |

Missing and invalid numeric values are excluded from numeric aggregations and
reported through `validCount` and `missingCount`. Empty numeric aggregations
return `null`; empty counts return `0`; an empty percentage returns `null`.

### Metric result

| Field | Description |
| --- | --- |
| `name`, `title` | Configured name and title |
| `value` | Raw number or `null` |
| `formattedValue` | Formatted string, empty when `value` is `null` |
| `description`, `prefix`, `suffix` | Display text |
| `aggregation` | Canonical aggregation name (`custom` for functions) |
| `column`, `locale`, `currency` | Resolved configuration |
| `rowCount` | Total normalized rows |
| `matchedRowCount` | Rows after the filter |
| `validCount` / `missingCount` | Valid numeric values and ignored/missing values |
| `comparison` | Comparison result or `null` |
| `direction` | `up`, `down`, `flat` or `null` |
| `trend` | Effective trend after `trend` and comparison resolution |
| `state` | `positive`, `negative` or `neutral` |
| `metadata` | Aggregation, counts, filter kind and comparison details |

### Comparisons

```ts
createMetric({
  name: "Revenue",
  data,
  column: "revenue",
  comparison: {
    data: previous,           // or value: 400000
    column: "revenue",
    aggregation: "sum",
    label: "vs last month"
  }
});
```

`MetricComparisonResult` exposes `source` (`"data"` or `"value"`), `value`,
`formattedValue`, `difference`, `formattedDifference`, `percentageChange`, `growth`, `direction`,
`label` and comparison row counts. `percentageChange` is expressed in percentage
points and `growth` is a ratio. Both are `null` when the comparison value is `0`
or missing; `direction` is `null` when either side is `null`.

### Metric methods

| Method | Description |
| --- | --- |
| `render(target)` | Renders the KPI card into a selector or element |
| `update(config)` | Re-resolves configuration, recomputes and re-renders |
| `setData(data)` | Replaces data and recomputes |
| `setLoading(bool)` | Toggles the loading appearance |
| `setError(string \| null)` | Shows or clears an error |
| `refresh()` | Recomputes against current data |
| `destroy()` | Removes the card and marks the metric destroyed |

`result`, `config`, `element` and `isDestroyed` are readable properties. String
values and formatter results are inserted as text, never HTML.

## React entry point

`@munachi-me/numviz/react` exports `DataTable`, `Metric` and the
`DataTableProps`, `DataTableHandle`, `MetricProps` and `MetricHandle` types.
React is an optional peer dependency (`>=18`) and the core entry never imports
it. Both components render only a host element during server rendering. See
[frameworks.md](./frameworks.md) for Next.js guidance.

## Axes

```ts
interface AxisConfig {
  title?: string;
  show?: boolean;        // default true
  grid?: boolean;        // default true for numeric Y, false for category X
  rotate?: number;       // -90..90 degrees of tick-label rotation
  tickFormat?: (value: number | string | Date) => string;
  min?: number;          // numeric axes only
  max?: number;          // numeric axes only
}
```

Numeric axes use nice ticks derived from the data (or `min`/`max`). Category
axes truncate or rotate labels when space is tight. Horizontal-bar and
histogram charts put the numeric axis on X, with vertical grid lines available
through `xAxis.grid`.

## Data

```ts
export type DataInput =
  | readonly Record<string, unknown>[]
  | readonly (readonly unknown[])[]
  | DatasetLike;

export interface DatasetLike {
  columns?: readonly (string | { key: string; label?: string; type?: ColumnType })[];
  rows?: readonly (Record<string, unknown> | readonly unknown[])[];
  data?: readonly Record<string, unknown>[];
}
```

Column types are inferred unless a definition supplies `type`. Inference checks
all non-missing values: numeric majority (at least two thirds) → `number`;
all ISO date-like values → `date`; all booleans or `"true"`/`"false"` →
`boolean`; otherwise `string`.

Declared columns are preserved even when records omit them: they keep their
declared order, appear in the normalized dataset, and their values are `null`.
Record keys that were not declared are appended after the declared columns.

For array-of-arrays input, rows may be shorter than the column list and the
missing cells become `null`. Rows longer than the column list raise
`INVALID_DATA` with `details: { row, expected, received }` so extra values are
never discarded silently.

Normalization never mutates input. Each normalized row keeps a `source`
reference to the original record.

## Series behaviour by chart type

| Chart type | Series behaviour |
| --- | --- |
| `bar` | One series fills the slot; multiple series render side by side |
| `grouped-bar` | Side-by-side bars for every series |
| `stacked-bar` | Positive and negative stacks per category |
| `horizontal-bar` | Grouped bars extending horizontally |
| `line` / `area` | One path and point set per series; areas overlap |
| `scatter` | Points per series using numeric or date X |
| `histogram` | Uses the first visible series, bins its values |
| `radar` | One polygon per series across category spokes |
| `pie` / `doughnut` | Slices come from rows; `series` is not used |

## Legend and interactions

```ts
interface LegendConfig {
  show?: boolean;
  position?: "top" | "right" | "bottom" | "left";
  interactive?: boolean; // default true
}
```

Legend items toggle their series by pointer click or Enter/Space and expose
`aria-pressed`. `setSeriesVisible(index, visible)` performs the same action from
code. Hovered and focused marks dim other categories (bars) or other series
(line, area, scatter, radar, pie).

```ts
interface ChartClickEvent {
  type: ChartType;
  label: string;
  field: string;
  series?: string;
  value: number | null;
  index: number;
  originalEvent: Event;
}
```

## Theme tokens

| Token | Purpose |
| --- | --- |
| `mode` | Resolved `light` or `dark` appearance |
| `background`, `surface`, `surfaceElevated` | Layers |
| `text`, `mutedText` | Text hierarchy |
| `border`, `grid` | Dividers and gridlines |
| `accent` | Primary accent |
| `positive`, `warning`, `danger`, `info` | Semantic states |
| `fontFamily`, `borderRadius` | Typography and shape |
| `chartPalette` | Default series colours |

Every token in the table is configurable through `ThemeConfig`. Charts and
tables expose CSS custom properties (`--nv-*`, including
`--nv-surface-elevated`, `--nv-positive`, `--nv-warning`, `--nv-danger`,
`--nv-info` and `--nv-animation-duration`) and documented class hooks so
applications can restyle output without forking the renderer.

## Errors

```ts
class NumvizError extends Error {
  code: NumvizErrorCode;
  path?: string;
  details?: Record<string, unknown>;
}
```

Codes: `INVALID_CONFIG`, `INVALID_TYPE`, `INVALID_DATA`, `INVALID_CONTAINER`,
`CONTAINER_NOT_FOUND`, `NO_DOM`, `DESTROYED`. Use `isNumvizError(error)` for
narrowing.

## Configuration validation

Configuration errors throw `NumvizError` with `code: "INVALID_CONFIG"` and the
offending `path`. Validated values include:

- `theme` string tokens (`accent`, `fontFamily`, `background`, `surface`,
  `surfaceElevated`, `text`, `mutedText`, `border`, `grid`, `positive`,
  `warning`, `danger`, `info`), `theme.chartPalette` entries and
  `theme.borderRadius`.
- `series` must be a non-empty array of objects with non-empty `field`,
  optional non-empty `label` and `color`, and unique fields.
- `legend.show`, `legend.interactive`, `legend.position`.
- `labels.show`, `labels.position`, `labels.formatter`.
- `tooltip.show`, `tooltip.formatter`.
- `animation.enabled`, `animation.duration`.
- `responsive`, `width`, `height`, `bins`, `onClick`.
- `xAxis`/`yAxis` `show`, `grid`, `rotate`, `title`, `tickFormat`, `min`, `max`.

Data shape errors throw `code: "INVALID_DATA"` (including ragged
array-of-arrays rows and non-numeric value columns).

## Rendering model

- Charts are SVG with a `viewBox`; width follows the container unless `width`
  is set, and a `ResizeObserver` re-renders responsive charts on resize.
- Rendering uses the target element's `ownerDocument` and `defaultView`:
  styles, SVG nodes, `ResizeObserver`, `requestAnimationFrame` and system theme
  detection all come from the owning document/window. This makes iframe
  rendering first-class. String selectors resolve against the global document;
  pass an element for targets in another document.
- Titles, axes, legends, labels, grid lines and marks are part of the chart
  output. Tooltips are HTML elements positioned over the chart root.
- Marks are focusable and expose `aria-label` values.
- Animations are CSS-only, configurable and disabled for reduced-motion users.
- Styles are structural; colours come from theme tokens, so overrides do not
  leak between charts.
