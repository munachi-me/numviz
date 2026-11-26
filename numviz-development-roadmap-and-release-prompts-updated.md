# NUMVIZ --- Complete Development Roadmap & Release Prompts

**Package:** `numviz`\
**Language:** TypeScript\
**Product:** Framework-independent JavaScript visualization and
dashboard platform\
**Initial release:** `0.1.0`

------------------------------------------------------------------------

# Product vision

Numviz is an independent visualization platform for JavaScript
developers. It should provide charts, HTML tables, metrics, dashboards,
interactions, and export capabilities.

It must work with ordinary JavaScript data and optionally consume Numiq
datasets. Numiq is responsible for loading, preparing, transforming, and
analyzing data; Numviz is responsible for presenting data visually.

Numviz must not require Numiq, React, Next.js, or any other framework to
use its core functionality.

## Core environments

1.  **Vanilla JavaScript:** render into developer-supplied DOM elements.
2.  **React:** provide components through `numviz/react`.
3.  **Next.js:** support App Router and Pages Router, with correct
    server/client boundaries.
4.  **Standalone output:** generate a complete HTML/CSS/JavaScript
    dashboard project that can be hosted independently.

React must be an optional peer dependency, not a core dependency. Do not
access browser globals during server-side rendering.

## Global technical requirements

-   TypeScript-first, strict type checking, ESM-first package.
-   Provide type declarations and appropriate CommonJS compatibility
    where practical.
-   Keep runtime dependencies minimal.
-   Separate core logic, data adapters, chart specifications, renderers,
    tables, metrics, dashboard composition, themes, framework adapters,
    and export functionality.
-   Avoid circular dependencies and monolithic source files.
-   Validate public configurations and provide useful errors.
-   Do not unexpectedly mutate input data.
-   Support arrays of objects, arrays of arrays with column definitions,
    and compatible Numiq datasets.
-   Normalize data internally for rendering: column names, missing
    values, numeric values, dates, strings, and categorical values.
-   Keep browser rendering separate from Node.js filesystem/export
    operations.
-   Provide automated tests, practical examples, documentation,
    changelogs, and migration notes where necessary.

## Public API consistency — dual import implementation

The package must implement and maintain **both default and named imports** as first-class, fully supported public APIs. This is a core package requirement, not a convenience alias to add later.

### Default namespace import

Developers must be able to import the default `Numviz` object and access the public API through it:

```ts
import Numviz from "numviz";

const chart = Numviz.createChart({
  type: "bar",
  data,
  x: "month",
  y: "revenue"
});

const table = Numviz.createTable({ data });
const metric = Numviz.createMetric({
  name: "Total Revenue",
  data,
  column: "revenue",
  aggregation: "sum"
});
```

### Named imports

Developers must also be able to import individual public functions:

```ts
import {
  createChart,
  createTable,
  createMetric,
  createDashboard
} from "numviz";

const chart = createChart({
  type: "bar",
  data,
  x: "month",
  y: "revenue"
});
```

### Implementation requirements

- Export every supported top-level public API function as a named export.
- Build the default `Numviz` namespace from those same public function references. Do not maintain a separate implementation for the default export.
- The default namespace must expose the same applicable stable API as the named exports. Adding a public function must update both export surfaces in the same release.
- Both import styles must have equivalent behavior, types, configuration options, errors, and lifecycle behavior.
- Generate correct TypeScript declarations for both import styles.
- Configure `package.json` `exports`, `types`, and build outputs so supported ESM imports resolve correctly. Add CommonJS compatibility only if it can be built and tested reliably; do not advertise unsupported module formats.
- Test the package from an installed-package consumer fixture, not only through internal source imports. Verify default import, named imports, and mixed imports in supported environments.
- Avoid circular imports when assembling the default namespace. Use a clear public entry point (for example, `src/index.ts`) that re-exports named APIs and constructs the default namespace from those exports.
- Keep framework-specific APIs in their documented subpaths, such as `numviz/react`. Do not make importing the core package require React.
- Where a subpath provides both default and named exports, document and test that behavior explicitly. Do not imply that a subpath supports a default export unless it is implemented.
- Document both import styles in the README and API documentation, including examples for JavaScript and TypeScript consumers.

### Suggested entry-point pattern

Use this as an architectural illustration, adapting it to the actual API and avoiding circular dependencies:

```ts
// src/index.ts
export { createChart } from "./charts/createChart";
export { createTable } from "./tables/createTable";
export { createMetric } from "./metrics/createMetric";
export { createDashboard } from "./dashboard/createDashboard";

import { createChart } from "./charts/createChart";
import { createTable } from "./tables/createTable";
import { createMetric } from "./metrics/createMetric";
import { createDashboard } from "./dashboard/createDashboard";

const Numviz = {
  createChart,
  createTable,
  createMetric,
  createDashboard
};

export default Numviz;
```

The namespace should contain only intentionally public APIs. Internal utilities, renderers, and implementation details must not accidentally become public exports.

Use documented Numiq public APIs only. Do not couple Numviz to Numiq internals.

## Release workflow

For every release:

1.  Inspect the repository and latest release.
2.  Review the previous release and identify regressions or unfinished
    work.
3.  Create a release-specific branch.
4.  Implement the current release scope without breaking stable earlier
    features.
5.  Run tests, type checks, linting, and production builds.
6.  Fix regressions and verify examples.
7.  Update README, API documentation, changelog, and package version.
8.  Prepare a complete ZIP of the project, excluding `node_modules`.
9.  Name the extracted project folder with its version,
    e.g. `numviz-v0.1.0`.
10. Include the LICENSE and all necessary source/configuration files.
11. Do not claim a test, build, or feature works unless it was actually
    verified.
12. Do not silently introduce breaking API changes.
13. Run consumer-level import tests for both `import Numviz from "numviz"`
    and named imports from `"numviz"` after every release that changes
    the public API. Verify generated declarations and package export
    mappings as well as runtime behavior.

------------------------------------------------------------------------

# Release 0.1.0 --- Core foundation

## Objective

Establish the package architecture, data adapter, chart configuration
model, and initial vanilla JavaScript chart renderer.

## Scope

### Package setup

Create a TypeScript npm package named `numviz`, including package
metadata, strict TypeScript configuration, build tooling, test tooling,
source structure, examples, README, LICENSE, and CHANGELOG. Configure
package exports and declaration generation. Establish the dual-import
entry-point architecture immediately: both `import Numviz from "numviz"`
and named imports such as `import { createChart } from "numviz"` must
work from the first release.

### Core API

Implement `createChart()` as a named export and expose the same function
through the default `Numviz` namespace (`Numviz.createChart()`). Build
the namespace from the same exported function references. Validate
chart configurations and expose useful errors.

### Data interface

Accept arrays of objects, arrays of arrays with explicit columns, and
compatible Numiq datasets. Normalize data internally. Handle empty data,
missing values, invalid values, numeric strings, dates, and categorical
values. Preserve the source data.

### Initial chart types

Implement: - Bar chart. - Line chart. - Pie chart. - Doughnut chart.

Use a maintainable rendering foundation, preferably SVG initially. Each
chart must render real visual output.

### Basic chart configuration

Support: - Title and subtitle. - X and Y fields. - Width and height. -
Basic colors and backgrounds. - Labels and legends. - Basic tooltips. -
Margins and spacing.

### Vanilla rendering

Support rendering to a selector or DOM element:

``` ts
const chart = createChart({
  type: "bar",
  data,
  x: "month",
  y: "revenue"
});

chart.render("#chart");
chart.destroy();
```

Handle missing containers and invalid configurations gracefully. Provide
lifecycle cleanup.

### Examples

Include working examples for each chart type, ordinary JavaScript data,
and Numiq dataset integration.

## Acceptance criteria

-   Package builds and declarations are generated.
-   Default namespace import (`Numviz.createChart()`) and named import
    (`createChart()`) both work from an installed-package consumer
    project and produce equivalent behavior.
-   The default namespace and named exports expose the same applicable
    public API without duplicated implementations.
-   All four chart types render in a browser.
-   Vanilla JavaScript works without a framework.
-   Numiq-compatible datasets can be consumed through public interfaces.
-   Tests and examples are verified.

------------------------------------------------------------------------

# Release 0.2.0 --- Advanced charts and customization

## Objective

Expand the chart engine and provide a richer visualization experience.

## Scope

### Additional chart types

Implement: - Area chart. - Stacked bar chart. - Grouped bar chart. -
Scatter plot. - Histogram. - Radar chart. - Horizontal bar chart. -
Multi-series line chart. - Multi-series area chart.

Prepare the architecture for future heatmaps, waterfall charts, box
plots, and treemaps.

### Multi-series support

``` ts
createChart({
  type: "line",
  data,
  x: "month",
  series: [
    { field: "revenue", label: "Revenue" },
    { field: "expenses", label: "Expenses" }
  ]
});
```

Support individual labels and colors per series.

### Axes

Support custom axis labels and titles, tick formatting, number/date
formatting, grid lines, visibility, rotation, and automatic or
configured ranges.

### Legends and tooltips

Support configurable position, visibility, formatting, content, and
series identification.

### Interactions

Implement hover effects, data-point highlighting, click events, and
legend-based series visibility.

### Styling and responsiveness

Support color palettes, individual series colors, borders, typography,
backgrounds, grid styling, and label positioning. Charts must resize
when their containers change size.

## Acceptance criteria

All previous features remain functional. Multi-series charts, axes,
legends, interactions, and responsive resizing work correctly. New
public APIs are available through both the default `Numviz` namespace
and named exports, with regression tests for both import styles.

------------------------------------------------------------------------

# Release 0.3.0 --- HTML table engine

## Objective

Build a first-class table visualization engine. This is a
browser-rendered HTML table feature, not console output.

## Core API

``` ts
const table = createTable({
  data,
  sortable: true,
  searchable: true,
  pagination: true
});

table.render("#table");
```

### Native HTML rendering

The vanilla renderer must use semantic `table`, `thead`, `tbody`, `tr`,
`th`, and `td` elements where appropriate. Do not imitate a table with
unrelated divs when native table elements are suitable. Include
accessible labels and semantics.

### Table features

Implement: - Automatic column detection and configurable columns. -
Column labels, ordering, visibility, and widths. - Sorting. -
Searching. - Pagination and page-size selection. - Row numbering. -
Empty and loading states. - Custom cell formatting and renderers. -
Number/date formatting. - Text alignment. - Row selection. - Custom CSS
classes and themes.

### Derived and conditional display columns

Support computed display columns without mutating the original data:

``` ts
createTable({
  data,
  columns: [
    { field: "name", label: "Employee" },
    { field: "salary", label: "Salary" },
    {
      field: "status",
      label: "Employment Status",
      render: row => row.active ? "Active" : "Inactive"
    }
  ]
});
```

### React integration

Create a separate `numviz/react` entry point with a `DataTable`
component. React remains optional. Support controlled/uncontrolled state
where appropriate.

### Next.js

Verify compatibility and document client-side interactivity and
server-rendering considerations.

### Themes

Provide minimal, striped, bordered, compact, and modern dashboard
styles, with light and dark themes.

### Large datasets

Use efficient pagination and avoid rendering every row unnecessarily.
Advanced virtualization may be deferred if needed.

## Acceptance criteria

Developers can create functional tables using vanilla JavaScript, React,
or Next.js. Browser output is a real HTML table.

------------------------------------------------------------------------

# Release 0.4.0 --- Metrics and KPI engine

## Objective

Provide reusable analytical metric calculations and rendered KPI cards.

### Core API

``` ts
const revenue = createMetric({
  name: "Total Revenue",
  data,
  column: "revenue",
  aggregation: "sum",
  format: "currency"
});
```

### Aggregations

Implement sum, average, count, distinct count, minimum, maximum, median,
percentage, and custom aggregation. Support filtered data and handle
invalid or missing values.

### Metric result

Expose a consistent result with name, raw value, formatted value,
description, aggregation, and relevant metadata. Metric calculations
must work independently of rendering.

### Comparisons

Support comparisons between periods or datasets, including difference,
percentage change, growth, and previous-period comparisons. Handle
division by zero and missing comparison values.

### KPI rendering

Support title, value, description, prefix/suffix, currency and
percentage formatting, trends, comparison values, positive/negative
states, icons or visual indicators, and custom colors.

### React

Provide a `Metric` component through `numviz/react`.

## Acceptance criteria

Metrics can be calculated and read as JavaScript values without
rendering, and rendered as KPI cards in vanilla JavaScript or React.

------------------------------------------------------------------------

# Release 0.5.0 --- Dashboard composition engine

## Objective

Combine charts, tables, metrics, and content into responsive dashboards.

### Core API

``` ts
const dashboard = createDashboard({
  title: "Sales Analytics",
  description: "Business performance overview",
  components: [
    {
      id: "revenue",
      type: "metric",
      title: "Total Revenue",
      data,
      column: "revenue",
      aggregation: "sum"
    },
    {
      id: "sales",
      type: "chart",
      chartType: "bar",
      data,
      x: "month",
      y: "revenue"
    },
    {
      id: "records",
      type: "table",
      data
    }
  ]
});

dashboard.render("#dashboard");
```

### Dashboard components

Support charts, tables, metrics, headings, text blocks, descriptions,
dividers, images, and custom components through an explicit safe
extension mechanism.

### Layout engine

Implement responsive grid layouts, columns, rows, component dimensions,
positioning, ordering, gaps, padding, alignment, and breakpoints.

### Configuration

Support title, description, theme, background, layout, header, footer,
component configurations, and global formatting.

### Multiple datasets

Allow components to reference different datasets. Never assume every
dashboard component uses the same dataset.

### Lifecycle

Provide consistent render, update, refresh, and destroy capabilities.
Ensure cleanup and component state management.

### React

Provide a `Dashboard` component and allow developers to compose
individual React components without using the full dashboard component.

## Acceptance criteria

A responsive dashboard containing multiple independent charts, metrics,
and tables can be created and rendered.

------------------------------------------------------------------------

# Release 0.6.0 --- Framework integrations and developer experience

## Objective

Stabilize integration with existing applications.

### React integration

Provide Chart, DataTable, Metric, Dashboard, and DashboardWidget
components. Support props-based configuration, controlled state,
callbacks, lifecycle, dynamic data, themes, and responsive rendering.
Avoid unnecessary re-renders.

### Next.js

Verify App Router, Pages Router, Server Components, Client Components,
dynamic imports, and static generation where practical. Document which
components require client execution. Never access `window` or `document`
during server rendering.

### Vanilla JavaScript

Improve DOM mounting, updates, events, validation, errors, CSS
customization, and lifecycle. Multiple instances must not conflict
through IDs or global styles.

### Theme system

Support light, dark, and custom themes, global configuration, and
per-component overrides. Example:

``` ts
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

### Documentation

Document installation, vanilla JS, React, Next.js, charts, tables,
metrics, dashboards, themes, events, and data integration.

## Acceptance criteria

All supported environments work reliably. Framework integrations remain
optional and documentation contains verified examples.

------------------------------------------------------------------------

# Release 0.7.0 --- Standalone dashboard generator

## Objective

Allow developers without a frontend framework to generate a complete,
independent dashboard project.

## Critical execution model

Writing a dashboard configuration does not create files. The developer
must execute the code that calls the export operation.

For example:

``` ts
import { createDashboard } from "numviz";

const dashboard = createDashboard({
  title: "Sales Analytics",
  data,
  components: [
    {
      id: "revenue",
      type: "metric",
      title: "Total Revenue",
      column: "revenue",
      aggregation: "sum"
    },
    {
      id: "sales-chart",
      type: "chart",
      chartType: "bar",
      x: "month",
      y: "revenue"
    },
    {
      id: "sales-table",
      type: "table",
      searchable: true,
      sortable: true
    }
  ]
});

await dashboard.export({
  format: "html",
  output: "./dashboard"
});
```

The developer runs the script with an appropriate runtime, for example:

``` bash
npx tsx index.ts
```

Or compiles TypeScript and executes the resulting JavaScript with
Node.js. The export operation then writes files to disk.

## Generated project

Generate a directory such as:

``` text
dashboard/
├── index.html
├── assets/
│   ├── styles.css
│   └── dashboard.js
├── data/
│   └── data.json
└── README.md
```

The exact structure may be refined, but assets must be organized and
understandable.

### Standalone requirements

The generated dashboard must: - Render without React or Next.js. - Work
without an installed Numviz package. - Include or bundle all required
runtime assets. - Display charts, tables, and metrics. - Preserve
styling and responsive layouts. - Support applicable interactions. -
Handle missing data gracefully. - Be deployable to ordinary static
hosting.

### Output modes

Primary requirement:

``` ts
await dashboard.export({
  format: "html",
  output: "./dashboard"
});
```

Optionally support a single HTML file:

``` ts
await dashboard.export({
  format: "html",
  output: "./dashboard.html"
});
```

Do not sacrifice functionality for single-file output.

### Data modes

Support embedded data and external data files. Warn that embedded data
is visible to anyone who can access the generated files. Do not assume
browsers can fetch local JSON files through `file://`; document when a
local HTTP server is required.

### Customization

Support title, description, logo, colors, themes, fonts, layout,
spacing, background, header, and footer.

### Static deployment

Document deployment to GitHub Pages, Vercel, Netlify, and ordinary
static hosting. No backend should be required for static dashboards.

### CLI

Consider a CLI with commands such as:

``` bash
numviz build
numviz build --output ./dashboard
```

Use a documented configuration file. Do not require framework-specific
project structure.

### Generated dashboard quality

The output must look like a finished analytics application, with a
professional header, responsive grid, consistent spacing, metric cards,
chart containers, table styling, and theme support.

## Acceptance criteria

A developer executes a script, Numviz creates a dashboard directory, and
the resulting dashboard works independently without Numviz installed in
the generated project.

------------------------------------------------------------------------

# Release 0.8.0 --- Advanced interactions and data experience

## Objective

Make dashboards interactive rather than static collections of
visualizations.

### Filtering

Support dropdown, search, date-range, numeric-range, category,
multi-select, and custom filters.

### Cross-filtering

Allow interaction with one component to filter connected charts, tables,
and metrics. For example, clicking a bar for January can filter
connected components to January. Make connections configurable.

### Drilldowns

Support hierarchical exploration such as year to month, month to day,
category to subcategory, and department to employee.

### Selection

Support row selection, chart point selection, multi-selection,
callbacks, and selected-data retrieval.

### Dynamic updates

Provide consistent methods for replacing or updating data and
configuration without unnecessarily recreating visualizations. Final
method names must be consistent and documented.

### Event system

Support documented chart click/hover, selection, filter change, table
sorting/pagination, metric update, and dashboard change events.

### Dashboard state

Serialize and restore applicable filters, selections, visible columns,
component visibility, and layout preferences.

### Advanced charts

Where the architecture is ready, add heatmap, waterfall, box plot,
treemap, and funnel charts. Prioritize correctness and performance over
chart count.

## Acceptance criteria

Components communicate through documented events and filters. Dashboards
update correctly and supported state can be saved and restored.

------------------------------------------------------------------------

# Release 0.9.0 --- Export, reporting, and sharing

## Objective

Enable professional reporting and distribution.

### Chart export

Support PNG and SVG, plus other formats where practical. Preserve
quality and dimensions.

### Table export

Support CSV, JSON, and HTML. Preserve displayed column labels and
relevant formatting where appropriate.

### Dashboard export

Improve standalone HTML and directory exports, embedded/external data
handling, theme and layout preservation, and interactive behavior.

### Printing and PDF

Provide print-friendly layouts and browser print support. Add a reliable
PDF workflow where practical. Ensure charts fit pages, tables remain
readable, headers/footers work, and unnecessary controls are excluded.

### Reports

Provide reusable configurations for executive summaries, analytical
reports, KPI reports, data tables, chart collections, and dashboard
reports.

### Sharing

Generate portable static dashboards suitable for hosting. Do not require
a Numviz cloud service.

### Security

Do not execute arbitrary untrusted HTML or JavaScript from data values.
Validate generated content, sanitize unsafe content, and document the
risks of embedding datasets.

## Acceptance criteria

Charts, tables, and dashboards export reliably, print appropriately, and
can be shared while preserving intended appearance and functionality.

------------------------------------------------------------------------

# Release 1.0.0 --- Production release

## Objective

Stabilize the public API and deliver a production-ready major release.
Prioritize quality over unrelated new features.

### API stability

Review public APIs, naming, and behavior. Remove or clearly mark
experimental APIs. Provide migration documentation for unavoidable
breaking changes.

### Performance

Review large charts and tables, dashboard rendering, multiple instances,
dynamic updates, memory management, event cleanup, and framework
re-rendering.

### Accessibility

Review keyboard navigation, table semantics, chart descriptions, labels,
contrast, focus management, screen-reader support, and non-color
indicators. Provide textual summaries where appropriate.

### Reliability

Test Node.js, modern browsers, vanilla JavaScript, React, and Next.js.
Isolate browser-only operations.

### Documentation

Complete getting started, installation, API reference, examples,
framework guides, charts, tables, metrics, dashboards, themes, events,
export, troubleshooting, and migration documentation.

### Package quality

Review package size, tree-shaking, declarations, ESM compatibility,
optional peer dependencies, build output, licensing, dependencies, and
npm package contents.

### Release deliverables

Prepare version 1.0.0, changelog, release notes, npm package, GitHub
tag, GitHub release, and complete ZIP.

## Acceptance criteria

Numviz is stable, documented, tested, and suitable for real-world
application development.

------------------------------------------------------------------------

# Post-1.0 expansion

These are future opportunities, not requirements for the initial
releases:

1.  Visual drag-and-drop dashboard builder.
2.  Advanced geographic maps, network graphs, Sankey diagrams, Gantt
    charts, calendar heatmaps, financial charts, and statistical plots.
3.  Reusable sales, finance, marketing, HR, inventory, education, and
    business dashboard templates.
4.  Deeper Numiq integration for multiple datasets and analytical
    results.
5.  Plugin architecture for custom chart renderers, table renderers,
    dashboard widgets, formatters, themes, and export adapters.
6.  Optional hosted dashboard ecosystem, without making cloud hosting
    mandatory for the npm library.

------------------------------------------------------------------------

# Definition of success

A developer should be able to:

### Create a chart

``` ts
import { createChart } from "numviz";

createChart({
  type: "bar",
  data,
  x: "month",
  y: "revenue"
}).render("#chart");
```

### Create a browser table

``` ts
import { createTable } from "numviz";

createTable({
  data,
  sortable: true,
  searchable: true,
  pagination: true
}).render("#table");
```

### Create a metric

``` ts
import { createMetric } from "numviz";

const revenue = createMetric({
  name: "Revenue",
  data,
  column: "revenue",
  aggregation: "sum"
});

console.log(revenue.value);
revenue.render("#metric");
```

### Use React

``` tsx
import { Chart, DataTable, Metric } from "numviz/react";
```

### Generate a standalone dashboard

``` ts
import { createDashboard } from "numviz";

const dashboard = createDashboard({
  title: "Business Analytics",
  data,
  components: [
    { type: "metric", column: "revenue" },
    { type: "chart", chartType: "line", x: "month", y: "revenue" },
    { type: "table" }
  ]
});

await dashboard.export({
  format: "html",
  output: "./dashboard"
});
```

The developer must execute this script. The export method then creates
the HTML, CSS, JavaScript, and any required data/assets on disk.

# Final product principle

Numviz should make visualization easy without limiting customization.

A beginner should be able to generate a useful dashboard with minimal
code. An experienced developer should be able to control every important
aspect of the visualization. Vanilla JavaScript developers should have
access to the same core capabilities as React and Next.js developers.

Keep Numviz independent, modular, framework-agnostic, and compatible
with Numiq. Do not prioritize feature count over a reliable foundation.
Every release must be complete, tested, documented, and compatible with
the previous stable release.


---

# Numviz Design System & Styling Roadmap

## Product styling direction

Numviz follows a **balanced visual direction**: a minimal, readable foundation enhanced with carefully chosen premium details. It should look polished and professional out of the box without imposing a visual identity that developers cannot change.

The theme flexibility decision is **All**:
- Built-in themes and appearance modes.
- Fully configurable theme tokens and component-level styling.
- Custom CSS, CSS variables, and class hooks where appropriate.
- Consistent styling across vanilla JS, React, and generated standalone dashboards.

The default design should use neutral surfaces, a restrained blue/indigo accent, clear typography, subtle borders and shadows, moderate corner radii, consistent spacing, and restrained motion. Avoid excessive gradients, oversized rounding, visual clutter, and decorative effects that reduce data readability.

## Styling principles

1. **Readable first:** data labels, values, tables, legends, and tooltips must remain clear at realistic dashboard sizes.
2. **Consistent by default:** charts, tables, metric cards, and dashboard containers share design tokens.
3. **Customizable at every level:** developers can set global themes and override individual components.
4. **Framework-independent:** the core styling model must work in vanilla JS and must not depend on React.
5. **Export parity:** a standalone HTML dashboard should preserve the appearance of its in-app preview.
6. **Responsive:** components adapt to narrow containers and mobile screens without clipping essential information.
7. **Accessible:** support keyboard interaction where applicable, visible focus states, and adequate contrast.
8. **Safe customization:** custom CSS must be opt-in and should not be required for ordinary use.

## Theme API direction

The public API should support simple presets and detailed customization. The exact API can be refined during implementation, but it should be consistent across all renderers.

```ts
import { createDashboard } from "numviz";

const dashboard = createDashboard({
  title: "Sales Analytics",
  theme: {
    mode: "dark", // "light" | "dark" | "system"
    accent: "#6366F1",
    fontFamily: "Inter, sans-serif",
    borderRadius: 12,
    chartPalette: [
      "#6366F1",
      "#06B6D4",
      "#10B981",
      "#F59E0B"
    ]
  },
  components: []
});
```

The theme system should provide:
- `light`, `dark`, and `system` modes.
- A default balanced theme.
- Semantic color tokens for page background, surface, elevated surface, text, muted text, border, accent, success, warning, danger, and informational states.
- Typography tokens, spacing scale, radii, shadows, borders, and focus styles.
- Chart palettes and series color assignment.
- Component-level overrides for charts, tables, metrics, and dashboard widgets.
- CSS custom properties and documented class hooks.
- Optional custom CSS injection for browser rendering and standalone export.
- Theme inheritance: component overrides take precedence over dashboard theme, which takes precedence over library defaults.
- A predictable behavior when a developer supplies only some theme values.

Do not make a particular font, icon library, or CSS framework a mandatory runtime dependency. Use sensible system-font fallbacks. Do not assume Tailwind or any framework is installed.

## Styling coverage

### Charts
Support chart-level palettes and per-series colors, backgrounds, plot area, axes, gridlines, tick labels, legends, tooltips, data labels, markers, line widths, bar radii, hover and selection states, animation preferences, and responsive sizing. Color choices must preserve contrast and distinguish series.

### Tables
Support header and body typography, row height, cell padding, borders, zebra striping, hover and selected states, sticky headers where supported, empty/loading/error states, pagination, search controls, and conditional cell/row styling.

### Metrics and KPI cards
Support value and label hierarchy, descriptions, icons where supplied, trend indicators, comparison text, positive/negative/neutral states, card surfaces, borders, shadows, and loading/empty states.

### Dashboards
Support page background, content width, grid gaps, widget surfaces, card variants, section headings, responsive breakpoints, and per-widget overrides. Dashboard-level styling should not leak unpredictably into embedded components.

### Interaction and state styling
Provide consistent focus, hover, active, disabled, selected, loading, empty, and error states. Motion should be restrained, respect reduced-motion preferences, and be configurable or disabled.

## Release-by-release styling requirements

### v0.1.0 — Foundation and default visual language
- Establish the initial design tokens and balanced default theme.
- Define typography, spacing, radii, borders, surfaces, and semantic colors.
- Give initial charts a coherent palette and consistent axes, labels, and tooltips.
- Ensure the initial vanilla renderer has sensible responsive behavior.
- Keep rendering styles isolated from data and chart calculations.
- Document the initial styling configuration and avoid hardcoded one-off component styles.

### v0.2.0 — Chart styling controls
- Add chart palettes and per-series color overrides.
- Add styling controls for axes, gridlines, legends, tooltips, markers, data labels, and chart backgrounds.
- Standardize hover, focus, and selection states.
- Add animation configuration and reduced-motion support.
- Ensure chart styling remains responsive and readable.

### v0.3.0 — Table styling
- Add table themes for headers, rows, cells, borders, and spacing.
- Add zebra striping, hover and selected-row states, and sticky-header styling where supported.
- Style search, sorting, and pagination controls consistently.
- Add customizable empty, loading, and error states.
- Support conditional formatting without requiring developers to replace the table renderer.

### v0.4.0 — Metric and KPI styling
- Add metric card variants and configurable value/label hierarchy.
- Style trend and comparison indicators with semantic states.
- Support icons supplied by the developer without requiring a specific icon package.
- Add loading, empty, and error appearances.
- Allow individual metric cards to override global tokens.

### v0.5.0 — Dashboard styling and layout
- Apply shared theme tokens across dashboard widgets.
- Add dashboard backgrounds, widget surfaces, spacing, borders, shadows, and layout variants.
- Support per-widget styling overrides.
- Ensure responsive grid behavior and prevent style leakage between widgets.
- Keep dashboard layout configuration separate from visual theme configuration.

### v0.6.0 — Theme system and framework parity
- Finalize `light`, `dark`, and `system` modes and the default balanced theme.
- Add complete custom theme configuration and semantic design tokens.
- Add CSS variables and documented class hooks.
- Support component-level overrides and predictable theme inheritance.
- Ensure vanilla and React renderers produce consistent styling.
Preserve the core package's default and named import APIs, and document
the React subpath's supported import forms separately.
- Verify Next.js SSR/client boundaries do not depend on browser globals during server rendering.
- Keep React optional and keep the theme engine framework-independent.

### v0.7.0 — Standalone export styling parity
- Include all required styles and runtime assets in generated standalone dashboards.
- Preserve the selected theme, custom tokens, chart palettes, and component overrides.
- Support embedded custom CSS where configured.
- Ensure generated dashboards do not require Numviz, React, Next.js, or a CSS framework to be installed in the destination project.
- Verify the generated output visually matches the browser preview.
- Ensure embedded and externally loaded data modes do not cause theme or layout differences.

### v0.8.0 — Interactive and advanced visualization styling
- Style filters, filter controls, drilldowns, selection states, and cross-filter highlights.
- Add consistent interaction states across all components.
- Extend palettes and styling configuration to advanced chart types.
- Ensure interactive states remain accessible and readable in light and dark themes.
- Add reduced-motion-aware transitions for dynamic updates.

### v0.9.0 — Export and reporting fidelity
- Preserve themes and component styling in HTML exports.
- Ensure SVG and PNG chart exports retain configured colors, fonts where available, labels, and backgrounds.
- Style print layouts and provide print-specific overrides.
- Add report-level theme configuration.
- Sanitize custom HTML/CSS inputs appropriately and document trust boundaries.
- Test exported output independently of the development environment.

### v1.0.0 — Design system stabilization
- Freeze and document the stable theme and styling APIs.
- Verify visual consistency across chart, table, metric, dashboard, React, vanilla, and standalone outputs.
- Audit responsive behavior, contrast, keyboard focus, and reduced-motion support.
- Remove inconsistent or undocumented styling behavior.
- Provide complete theme examples and customization documentation.
- Treat visual regression checks for core components as part of release quality.

## Styling acceptance criteria

A release should not be considered complete merely because its components render. At minimum:
- The default theme is coherent across every component delivered in that release.
- Light and dark appearances are legible wherever those modes are supported.
- Theme overrides do not unexpectedly affect unrelated components.
- Components fit narrow and wide containers.
- Focus, hover, disabled, loading, empty, and error states are considered where relevant.
- No mandatory third-party CSS framework or font is introduced.
- Generated standalone dashboards preserve the selected styling and work without the original development project.
- Documentation includes at least one default-theme example and one customization example.

