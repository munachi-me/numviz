# Numviz API reference — 1.0.1

## Entry points

```ts
import Numviz from "@munachi-me/numviz";              // default namespace
import { createChart, createTable, createMetric, createDashboard, createReport } from "@munachi-me/numviz";
import { Dashboard, DataTable, Metric } from "@munachi-me/numviz/react"; // optional React entry
```

The default namespace is frozen and contains `createChart`, `createTable`,
`createMetric`, `createDashboard`, `createReport`, `version` and `NumvizError`.
Named and default imports reference the same function implementations. The React
subpath is a separate optional entry and is the only module that imports React.

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
`ResolvedTableColumn`, `ChartExportOptions`, `ChartPNGExportOptions`,
`TableExportOptions`, `TableExportScope`, `TableCSVExportOptions`,
`TableJSONExportOptions`, `TableHTMLExportOptions`, `Report`, `ReportConfig`,
`ReportMetadata`, `ReportPreset`, `ReportType`, `Metric`, `MetricConfig`, `MetricResult`,
`MetricAggregation`, `MetricAggregationAlias`, `MetricAggregationName`, `MetricAggregator`,
`MetricComparisonConfig`, `MetricComparisonResult`, `MetricContext`,
`MetricDirection`, `MetricFilter`, `MetricRowFilter`, `MetricRowContext`,
`MetricFormat`, `MetricFormatPreset`, `MetricFormatContext`,
`MetricFormatter`, `MetricIcon`, `MetricState`, `MetricTrend`,
`MetricVariant`, `Dashboard`, `DashboardConfig`, `DashboardComponent`,
`DashboardChartComponent`, `DashboardTableComponent`,
`DashboardMetricComponent`, `DashboardHeadingComponent`,
`DashboardTextComponent`, `DashboardDescriptionComponent`,
`DashboardDividerComponent`, `DashboardImageComponent`,
`DashboardCustomComponent`, `DashboardDataMode`, `DashboardExportFile`,
`DashboardExportFormat`, `DashboardExportOptions`, `DashboardExportResult`,
`DashboardWidget`, `DashboardLayout`,
`DashboardColumns`, `DashboardBreakpoints`, `DashboardComponentLayout`,
`DashboardWidgetStyle`, `DashboardFormatConfig`, `DashboardHeaderConfig`,
`DashboardFooterConfig`, `DashboardVariant`, `ResolvedDashboardConfig` and
`ResolvedDashboardLayout`.

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
| `className` | `string` | — | Extra class name on the chart root |
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
| `update(config)` | Validate and replace configuration, then redraw in place |
| `getSummary()` | Plain-text chart description for assistive technology |
| `setSeriesVisible(index, visible)` | Toggle a series like a legend click |
| `toSVG(options?)` | Serialize the rendered chart to a standalone SVG string |
| `toPNG(options?)` | Rasterize the rendered chart to a PNG `Blob` in a browser |
| `destroy()` | Remove output, listeners and mark the chart destroyed |

Calling `render()` again removes previous output. `update()` keeps the chart
instance, normalizes the new data and redraws into the same container. Rendering
or updating a destroyed chart throws `DESTROYED`.

`toSVG()` requires a rendered chart and embeds the chart styles and theme tokens
so the result can be opened or stored independently. `ChartExportOptions`
accepts `width`, `height`, `scale` and `background`. `toPNG()` additionally
accepts `quality` and uses the browser image and canvas APIs; it rejects with
`EXPORT_FAILED` where canvas support is unavailable.

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
| `toCSV(options?)` | Exports filtered and sorted rows as CSV |
| `toJSON(options?)` | Exports filtered and sorted rows as JSON |
| `toHTML(options?)` | Exports filtered and sorted rows as an escaped HTML table |
| `getState()` | Sort, page, page count, query, selection and counts |
| `destroy()` | Removes output and listeners |

Table exports use displayed column labels and formatted values by default.
`TableExportOptions` provides `scope` (`"all"` or `"page"`) and `includeHidden`.
CSV options add `delimiter`, `includeHeaders`, `bom`, `lineEnding` and
`formulaProtection`. JSON options add `format` (`"objects"` or `"matrix"`),
`useLabels`, `raw`, `includeHeaders` and `pretty`. HTML options add
`includeHeaders` and `includeTitle`. HTML output escapes captions, headers and
cell values.

CSV exports protect against spreadsheet formula injection by default. A cell
whose first significant character is `=`, `+`, `-`, `@`, a tab, a carriage return
or a line feed is prefixed with `'`. Leading whitespace and control or format
characters are ignored when detecting the prefix. Genuine negative numbers keep
their numeric presentation. Headers are exported as configured and are not
rewritten. Set `formulaProtection: false` only for trusted, non-spreadsheet
consumers. The apostrophe is part of the CSV payload, so parsers that do not
implement spreadsheet text markers will see it.

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

## `createDashboard(config): Dashboard`

Creates a responsive dashboard from independent components. Configuration is
validated immediately, including each chart, table and metric configuration.
Rendering is deferred until `render` is called.

```ts
import { createDashboard } from "@munachi-me/numviz";

const dashboard = createDashboard({
  title: "Sales Analytics",
  description: "Business performance overview",
  theme: { accent: "#4F46E5" },
  background: "#F8FAFC",
  format: { locale: "en-US", currency: "USD" },
  header: { text: "Updated just now" },
  footer: { text: "Internal reporting" },
  layout: {
    columns: { base: 1, sm: 2, lg: 4 },
    breakpoints: { sm: 640, md: 768, lg: 1024, xl: 1280 },
    gap: 16,
    rowGap: 16,
    padding: 0,
    align: "stretch",
    variant: "default"
  },
  widgetStyle: { boxShadow: "sm" },
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
    { id: "records", type: "table", data: employeeRows }
  ]
});

dashboard.render("#dashboard");
```

### Components

| `type` | Required fields | Notes |
| --- | --- | --- |
| `"chart"` | `id`, `chartType`, `data` | Accepts `ChartConfig` fields except `type`; maps `chartType` to the chart type |
| `"table"` | `id`, `data` | Accepts all `TableConfig` fields |
| `"metric"` | `id`, `data`, and `name` or `title` | Accepts all `MetricConfig` fields; `title` becomes the metric name when `name` is omitted |
| `"heading"` | `id`, `text` | Optional `level` from 1 to 6; default 2 |
| `"text"` | `id`, `text` | Plain text paragraph |
| `"description"` | `id`, `text` | Muted supporting paragraph |
| `"divider"` | `id` | Horizontal rule |
| `"image"` | `id`, `src`, `alt` | Optional `width`, `height`, `fit` (`cover` or `contain`) and `caption` |
| `"custom"` | `id`, `render` | Explicit safe extension; optional `destroy` |

Every component accepts `title`, `ariaLabel`, `layout`, `style`, `visible` and
`crossFilter`. Component ids must be unique and non-empty. `visible: false`
starts the widget hidden; toggle it later with `setComponentVisible`.

Charts and tables may declare `crossFilter` to turn a click or row selection
into a dashboard filter:

```ts
{
  id: "sales",
  type: "chart",
  chartType: "bar",
  data,
  x: "region",
  y: "revenue",
  crossFilter: { field: "region", targets: ["records", "total"] }
}
```

`crossFilter` accepts `field` (defaults to the chart X field or first table
column), `targets` (defaults to every compatible widget except the source),
`includeSelf` and `multi`.

A custom component receives a context with `id`, `document`, `dashboard` and
`component`. Its `render` callback may return a DOM node, a string or `null`.
Strings are inserted with `textContent`, never parsed as HTML. `destroy` is
called when the widget is removed or the dashboard is destroyed.

### Layout

`DashboardComponentLayout` controls one widget inside the grid:

| Field | Description |
| --- | --- |
| `column`, `row` | One-based grid start |
| `columnSpan`, `rowSpan` | Positive integer spans; column spans are clamped to the active breakpoint column count |
| `order` | CSS grid item order |
| `width`, `height`, `minWidth`, `minHeight` | Number (pixels) or CSS length |
| `align` | `start`, `center`, `end` or `stretch` |

Dashboard `layout.columns` accepts a number or an object with `base`, `sm`,
`md`, `lg` and `xl` counts. Missing breakpoint counts inherit from the previous
breakpoint. `layout.rows` accepts a row count or a CSS `grid-template-rows`
value, and `layout.autoRows` controls implicit row sizing. `layout.breakpoints` controls the minimum widths and must increase
from `sm` to `md` to `lg` to `xl`. Each dashboard gets unique scoped layout CSS,
so multiple dashboards do not share columns or breakpoints.

`layout.variant` is `default`, `compact` or `flush`. Visual per-widget overrides
live in `style` or dashboard `widgetStyle`:

```ts
{
  id: "sales",
  type: "chart",
  chartType: "line",
  data,
  x: "month",
  y: "revenue",
  layout: { columnSpan: 2, minHeight: 320, order: 1 },
  style: { background: "#0B1120", border: "0", padding: 12, boxShadow: "md" }
}
```

### Lifecycle

| Method | Description |
| --- | --- |
| `render(target)` | Renders into a selector or element |
| `update(config)` | Validates and reconciles widgets by id |
| `refresh()` | Re-renders against current component data |
| `getWidget(id)` | Returns the widget component, engine and element |
| `getFilter(id)` / `setFilter(id, value)` | Read or replace one filter value |
| `clearFilter(id)` / `clearFilters()` | Clear one or every filter |
| `getSelection(id)` / `setSelection(id, indices)` | Read or replace selected points or rows |
| `setComponentVisible(id, visible)` | Show or hide one widget |
| `getState()` / `setState(state)` | Serialize or restore dashboard state |
| `setWidgetData(id, data, columns?)` | Replace one widget dataset |
| `updateWidget(id, patch)` | Merge a partial component configuration |
| `on(type, listener)` / `off(type, listener)` | Subscribe to or remove dashboard events |
| `export(options)` | Writes a standalone HTML dashboard; Node.js only |
| `destroy()` | Destroys child engines, clears custom components and removes output |

`config`, `widgets`, `element` and `isDestroyed` are readable properties. Table
and metric engines are preserved across updates where the id and type match;
chart widgets are updated in place where possible. Removed widgets and their
engines are always destroyed.

The header is configured with `header: false` to hide it, a string for plain
header text, or an object containing `title`, `description`, `text`, `logo` and
`className`. Top-level `title` and `description` supply the defaults. `footer`
accepts a string, an object with `text` and `className`, or `false`.

### Filters

`DashboardConfig.filters` renders controls above the grid. A filter applies to
every widget whose data contains its `field`, unless `targets` names specific
widget ids. Multiple filters combine with AND; multi-select values combine with
OR.

```ts
createDashboard({
  filters: [
    { id: "region", type: "select", field: "region", label: "Region" },
    { id: "query", type: "search", field: "account", label: "Account" },
    { id: "revenue", type: "number-range", field: "revenue", label: "Revenue" },
    { id: "date", type: "date-range", field: "date", label: "Date" }
  ],
  components: [...]
});
```

| Type | Value | Notes |
| --- | --- | --- |
| `select` | primitive or `null` | Single dropdown; options may be explicit or derived from data |
| `multi-select` | primitive array or `null` | Multi-value dropdown; `select` also accepts `multi: true` |
| `search` | string | Case-insensitive substring match; omit `field` to search all fields |
| `date-range` | `{ from?, to? }` | Inclusive ISO date or timestamp range |
| `number-range` | `{ from?, to? }` | Inclusive numeric range |
| `custom` | any | `render(context)` returns a DOM node or text; optional `matches(row, value)` applies the value |

Every filter accepts `id`, `type`, `field`, `label`, `placeholder`, `targets`,
`defaultValue` and `className`. Select filters accept `options` as primitive
values or `{ label, value }` objects. Range filters accept `min`, `max` and (for
numbers) `step`. `defaultValue` is applied when the dashboard is created.

Custom filters receive `{ id, document, dashboard, filter, value, setValue }`.
Returned strings are inserted as text. `matches` receives
`{ id, values, row }` and the current value, and returns whether the row passes.
Custom filters cannot be serialized by standalone export.

Filter state can be changed directly:

```ts
dashboard.setFilter("region", "North");
dashboard.clearFilter("region");
dashboard.clearFilters();
dashboard.getFilter("region"); // "North" or null
```

Cross-filters created by chart clicks and table selection use ids of the form
`crossfilter:<widget-id>` and appear as removable chips in the filter bar.

### Events and state

```ts
const unsubscribe = dashboard.on("filterchange", ({ id, value, filters }) => {
  console.log(id, value, filters);
});

dashboard.on("selectionchange", ({ id, indices }) => {});
dashboard.on("widgetclick", ({ id, event }) => {});
dashboard.on("statechange", ({ state }) => {});
unsubscribe();
```

`getState()` returns:

```ts
{
  filters: { region: "North" },
  selections: { records: [0, 2] },
  visibleComponents: { chart: false, records: true },
  crossFilters: {
    "crossfilter:sales": {
      id: "crossfilter:sales",
      source: "sales",
      field: "region",
      value: "North"
    }
  }
}
```

`setState(state)` accepts a partial object and restores filters, selections,
visibility and serialized cross-filters. Filters and selections survive
`update`, `refresh`, `setWidgetData` and `updateWidget` where their widget and
field still exist.

Charts also expose point selection directly:
`chart.setSelectedIndex(index | null)` and `chart.getSelectedIndex()`.

### Standalone export

`dashboard.export(options)` writes a static dashboard that includes its own
Numviz runtime. The generated project does not need Numviz, React, Next.js or a
backend. Export is asynchronous and requires Node.js filesystem access.

```ts
const result = await dashboard.export({
  format: "html",
  output: "./dashboard",
  data: "embedded",
  title: "Sales Analytics",
  description: "Business performance overview",
  theme: { mode: "dark", colors: { primary: "#7057D9" } }
});

console.log(result.output, result.files);
```

| Option | Description |
| --- | --- |
| `format` | Only `"html"` is supported |
| `output` | Directory to create, or a `.html` path for single-file output |
| `data` | `"embedded"` (default) or `"external"` |
| `title`, `description` | Override the generated dashboard header |
| `logo` | Logo URL or data URI shown in the header |
| `theme` | Theme override, including colours and `fontFamily` |
| `fontFamily` | Convenience equivalent to `theme.fontFamily` |
| `background` | Page and dashboard background |
| `layout` | Dashboard grid layout override |
| `header`, `footer` | Header/footer overrides, or `false` to hide |

`DashboardExportResult` contains the resolved absolute `output`, `singleFile`,
`data` mode and the list of written `files` with byte sizes.

Directory output writes `index.html`, `assets/styles.css`,
`assets/dashboard.js`, `assets/numviz/runtime.js` and `README.md`. External data
adds `data/data.json`. Single-file output inlines the runtime, styles and data,
and therefore requires `data: "embedded"`.

```text
dashboard/
├── index.html
├── assets/
│   ├── styles.css
│   ├── dashboard.js
│   └── numviz/runtime.js
├── data/data.json
└── README.md
```

Custom dashboard components and custom filters cannot be exported because their
render functions are not serializable. Function-valued callbacks on charts,
tables and metrics are omitted; built-in filters, cross-filtering, hover, legend,
sorting, searching, selection and pagination interactions continue to work.
Serve external-data dashboards over HTTP; browsers block local JSON requests
from `file://`.

Generated pages include print styles that hide filter controls and table
toolbars, avoid breaking widgets across pages and set a 12 mm page margin.
Serialized configuration and data escape `<` before being placed inside a
script, and table HTML exports escape all values. Treat datasets from external
sources as untrusted input.

### Printing

`DashboardConfig.print` accepts a boolean or `DashboardPrintOptions`:

| Option | Description |
| --- | --- |
| `hideFilters` | Hide the filter bar when printing; defaults to true |
| `hideHeader` | Hide the dashboard header when printing |
| `hideFooter` | Hide the dashboard footer when printing |
| `pageBreak` | `"avoid"` (default) or `"auto"` for widget page breaks |

`dashboard.print(options?)` applies print classes and calls the browser print
dialog. It throws `EXPORT_FAILED` when the dashboard has not been rendered or
the environment has no print support. Pass `print: false` to disable print
helpers for a dashboard.

## `createReport(config): Report`

`createReport` creates a dashboard with a preset layout, print defaults and
report metadata. The returned `Report` supports every dashboard method and adds
`reportType`, `metadata` and a typed `print()` method.

```ts
import { createReport } from "@munachi-me/numviz";

const report = createReport({
  type: "executive",
  metadata: { title: "Q4 review", author: "Finance" },
  components: [
    {
      id: "revenue",
      type: "metric",
      name: "Revenue",
      data: rows,
      column: "revenue",
      aggregation: "sum"
    }
  ]
});

report.render("#report");
report.print();
```

Built-in types are `executive`, `analytical`, `kpi`, `table`, `charts` and
`dashboard`. `REPORT_PRESETS` exposes the layout and print defaults for each
type. Explicit `layout`, `print` and `widgetStyle` values override the preset.
`metadata.title` and `metadata.description` fill missing dashboard titles and
descriptions.

## React entry point

`@munachi-me/numviz/react` exports `Chart`, `Dashboard`, `DashboardWidget`,
`DataTable`, `Metric` and the matching `ChartProps`, `ChartHandle`,
`DashboardProps`, `DashboardHandle`, `DashboardWidgetProps`,
`DashboardWidgetHandle`, `DataTableProps`, `DataTableHandle`, `MetricProps` and
`MetricHandle` types. `Dashboard` accepts either a `components` array or direct
`DashboardWidget` children. React is an optional peer dependency (`>=18`) and
the core entry never imports it. All components render only a host element
during server rendering, and prop updates are structurally compared so equal
configurations do not rebuild engines. See [frameworks.md](./frameworks.md) for
Next.js guidance.

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

Every token in the table is configurable through `ThemeConfig`. The optional
`colors` object provides friendly aliases: `primary` maps to `accent`;
`background`, `surface`, `surfaceElevated`, `text`, `mutedText`, `border`,
`grid`, `positive`, `warning`, `danger` and `info` map to the same token names.
Explicit token names take precedence over aliases.

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
```

Charts and tables expose CSS custom properties (`--nv-*`, including
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
`CONTAINER_NOT_FOUND`, `NO_DOM`, `DESTROYED`, `EXPORT_FAILED`. Use
`isNumvizError(error)` for narrowing.

## Configuration validation

Configuration errors throw `NumvizError` with `code: "INVALID_CONFIG"` and the
offending `path`. Validated values include:

- `theme` string tokens (`accent`, `fontFamily`, `background`, `surface`,
  `surfaceElevated`, `text`, `mutedText`, `border`, `grid`, `positive`,
  `warning`, `danger`, `info`), `theme.colors` aliases, `theme.chartPalette`
  entries and `theme.borderRadius`.
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
