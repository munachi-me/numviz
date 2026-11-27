# Changelog

All notable changes to Numviz are documented in this file.

## [1.0.1] - 2026-11-27

### Fixed

- CSV exports now protect against spreadsheet formula injection. Cells whose
  first significant character is `=`, `+`, `-`, `@`, a tab, a carriage return or
  a line feed are prefixed with `'`. Leading whitespace and control or format
  characters are ignored when detecting the prefix.
- Genuine negative numeric values keep their numeric presentation, including
  formatted currency and percent values.
- Custom formatters cannot bypass formula protection when they return
  formula-like text, even for negative raw values.
- Existing CSV quoting for delimiters, quotes and newlines is preserved.
  JSON and HTML exports are unchanged.

### Improved

- The publish workflow now distinguishes dry runs from real publications,
  records the selected mode, version and dist-tag in the job summary, checks both
  registries before publishing, refuses to overwrite an existing version,
  verifies the published version and dist-tag after publication, and fails when
  either registry does not confirm the release.
- Manual workflow runs can publish explicitly to `latest` or `next`; dry runs
  remain the default and never publish.
- npm publication continues to use provenance. GitHub Packages publication uses
  the workflow `GITHUB_TOKEN` with `packages: write`.

### Verified

- 258 tests pass across 25 files.
- `npm run verify` covers type checking, ESLint, the full test suite, production
  builds, the standalone runtime and a packed consumer fixture.
- npm registry inspection confirms `@munachi-me/numviz@1.0.0` exists, is public,
  exposes the intended exports and React subpath, has no runtime dependencies,
  and its tarball matches the `v1.0.0` package metadata.

### Compatibility

- No breaking changes to chart, table, metric, dashboard, report or React APIs.
- `TableCSVExportOptions` adds `formulaProtection`, defaulting to `true`.
  Set it to `false` only for trusted, non-spreadsheet consumers.
- `1.0.1` is prepared for release; publication status is confirmed only after a
  registry check.

## [1.0.0] - 2026-11-27

### Added

- `Chart.getSummary()` for a plain-text chart description suitable for
  assistive technology, tests, exports and custom UI.
- Data-aware chart SVG descriptions with the chart type, fields, point count and
  series labels.

### Changed

- PNG chart export resolves `Image`, `Blob` and `URL` from the chart document,
  so charts inside iframes and other documents export correctly.
- Standalone SVG export uses the configured chart background when the root has
  no `--nv-background` token.
- The npm package includes the `docs` directory alongside `dist`, `README.md`,
  `LICENSE` and `CHANGELOG.md`.

### Accessibility

- Documented chart, table, dashboard and report accessibility behaviour in
  `docs/accessibility.md`.
- Added tests for chart names and descriptions, selected-point announcements,
  table semantics and large datasets.
- Added tests for charts with more than a thousand marks and for exporting
  thousands of table rows.

### Documentation

- Added `docs/migration.md` with upgrade notes from `0.6.0` through `1.0.0`.
- Added `docs/troubleshooting.md` for rendering, export, printing, SSR, large
  data and accessibility issues.
- Added a documentation index to the README.
- Completed the public API reference for chart, table, dashboard, report and
  print APIs.

### Package quality

- Verified the production build, standalone runtime, declarations, optional
  React peer dependency and packed consumer fixture.
- Verified the npm tarball contains the intended runtime, declarations, README,
  changelog, licence and documentation.

### Verified

- 239 tests pass across 24 files.
- `npm run verify` covers type checking, ESLint, tests, production builds, the
  standalone runtime and a packed consumer fixture.
- The report example and the new accessibility behaviour render in a browser.

### Compatibility

- No breaking changes to chart, table, metric, dashboard, report or React APIs.
- `Chart.getSummary()` is additive. Existing chart descriptions become more
  specific but keep the same `role`, `aria-label`, `<title>` and `<desc>`
  structure.
- npm publishing is prepared as `@munachi-me/numviz`; the release tarball is
  attached to the GitHub release.

## [0.9.0] - 2026-11-26

### Added

- `chart.toSVG(options?)` for portable SVG chart export with inline theme tokens
  and chart styles.
- `chart.toPNG(options?)` for browser PNG export with configurable width,
  height, scale and quality.
- `table.toCSV(options?)`, `table.toJSON(options?)` and `table.toHTML(options?)`.
  Exports use filtered and sorted rows, displayed column labels and cell
  formatting. `scope: "page"` limits output to the current page and
  `includeHidden` includes hidden columns.
- `DashboardPrintOptions`, `DashboardConfig.print` and `dashboard.print()`
  for print-specific layouts and the browser print dialog.
- Scoped print CSS that hides filters, table toolbars and interactive controls,
  avoids breaking widgets across pages and sets a page margin.
- `createReport(config)` and `REPORT_PRESETS` for executive, analytical, KPI,
  table, charts and dashboard reports. `createReport()` is also available from
  the default `Numviz` namespace.
- `Report`, `ReportConfig`, `ReportMetadata`, `ReportPreset`, `ReportType`,
  `ChartExportOptions`, `ChartPNGExportOptions`, `TableExportOptions`,
  `TableCSVExportOptions`, `TableJSONExportOptions` and
  `TableHTMLExportOptions` public types.

### Changed

- Standalone export now escapes `<` in serialized configuration and data before
  embedding it in a script, and includes print styles in generated pages.
- Table HTML export escapes headers, captions and cell values.
- The default namespace now includes `createReport` alongside the existing
  component factories.

### Verified

- 236 tests pass, including SVG chart export, unavailable PNG handling, CSV,
  JSON and HTML table export, report presets, print classes, print styles and
  malicious script-data escaping.
- `npm run verify` covers type checking, ESLint, the full test suite, production
  builds and a packed consumer fixture.

### Compatibility

- No breaking changes to chart, table, metric, dashboard or React APIs.
- Chart PNG export is browser-only and rejects with `EXPORT_FAILED` when image
  or canvas support is unavailable. SVG export works after rendering in any DOM.
- Reports are dashboards with report metadata, so existing dashboard APIs and
  standalone export continue to apply.

## [0.8.0] - 2026-11-26

### Added

- Dashboard filter bar with `select`, `multi-select`, `search`, `date-range`,
  `number-range` and custom filters. Select options can be explicit or derived
  from connected component data.
- Filter targeting with `targets`, defaults and AND/OR semantics. Filters apply
  to charts, tables and metrics without replacing their engines.
- Chart and table cross-filtering through `crossFilter`. Chart clicks and table
  row selection filter connected widgets and render removable filter chips.
- Point selection with `chart.setSelectedIndex(index | null)` and
  `chart.getSelectedIndex()`. Selected marks receive
  `numviz-chart__mark--selected`.
- Dashboard selection APIs: `getSelection(id)` and `setSelection(id, indices)`.
- Dashboard events: `filterchange`, `selectionchange`, `widgetclick` and
  `statechange`, with `on`/`off` subscriptions.
- Serializable dashboard state through `getState()` and `setState()`, including
  filters, selections, widget visibility and cross-filter definitions.
- Direct state methods `setFilter`, `clearFilter`, `clearFilters`,
  `setComponentVisible`, `setWidgetData` and `updateWidget`.
- Initial widget visibility with `visible` and configurable cross-filter
  `field`, `targets`, `includeSelf` and `multi`.
- Filter controls and interactive behaviour in standalone dashboard exports.
- Public types for filters, cross-filters, events, state and filter contexts.

### Changed

- Dashboard updates preserve active filters, selections and visibility when the
  widget and field still exist.
- Standalone export rejects custom filters as well as custom components because
  their render functions are not serializable.
- The filter bar, controls and active cross-filter chips use the dashboard
  theme tokens and responsive layout.

### Verified

- 224 tests pass, including filter controls, search, ranges, multi-select,
  targeting, cross-filtering, chart/table selection, events, state restore,
  dynamic data updates, standalone export and invalid configuration.
- Standalone filtered dashboards render and filter correctly in jsdom.

## [0.7.0] - 2026-11-27

### Added

- `dashboard.export(options)` for generating a standalone HTML dashboard from
  Node.js. Directory output includes `index.html`, `assets/styles.css`,
  `assets/dashboard.js`, `assets/numviz/runtime.js` and `README.md`.
- Single-file export when `output` ends in `.html`. The page inlines the
  runtime, styles, configuration and component data.
- Embedded and external data modes. `data: "external"` writes
  `data/data.json` and the generated page loads it at runtime.
- A self-contained browser runtime built from the Numviz core. Generated
  dashboards run without Numviz, React, Next.js or a backend installed.
- Export customisation for `title`, `description`, `logo`, `theme`,
  `fontFamily`, `background`, `layout`, `header` and `footer`.
- Optional `logo` support in dashboard headers and `DashboardHeaderConfig`.
- `DashboardExportOptions`, `DashboardExportResult`, `DashboardExportFile`,
  `DashboardExportFormat` and `DashboardDataMode` public types.
- `EXPORT_FAILED` error code for filesystem and serialization failures.

### Changed

- `npm run build` now emits `dist/standalone/numviz-runtime.js` after TypeScript
  compilation. The runtime bundle is included in the published package.
- Standalone dashboards align widgets to the start of their grid row by default
  unless the dashboard layout specifies another alignment.
- The packed consumer fixture now exercises standalone export and verifies the
  generated runtime contains no React imports.

### Verified

- 211 tests pass, including directory export, external data, single-file
  output, generated-page execution in jsdom, unsupported custom components and
  invalid export options.
- Embedded and external standalone dashboards were rendered in a browser from
  a static HTTP server, including metric cards, charts, tables and search.
- `npm run verify` covers type checking, linting, tests, production builds and a
  packed consumer fixture that exports a dashboard from the installed package.

### Compatibility

- No breaking changes to chart, table, metric, dashboard or React APIs.
  `DashboardHeaderConfig.logo` and the export API are additive.
- Standalone export is Node-only. Calling it without filesystem access rejects
  with an `EXPORT_FAILED` error. Custom dashboard components cannot be
  serialized because their render functions are not portable.

## [0.6.0] - 2026-11-26

### Added

- React `Chart` component with server-rendering-safe host output, an imperative
  `ChartHandle`, in-place updates for dynamic data and callbacks, and
  structural prop comparison so equal configurations do not redraw.
- React `DashboardWidget` component for rendering one dashboard widget outside
  a full dashboard. It accepts widget options directly or a `component` /
  `config` object and exposes the underlying dashboard and widget through a ref.
- Declarative dashboard composition: `Dashboard` now accepts `DashboardWidget`
  children, including inside fragments, and merges them with a `components`
  array in order.
- `Chart.update(config)` on the vanilla chart instance. It validates and
  normalizes the replacement configuration, keeps the instance and redraws in
  the same container. Invalid updates leave the previous chart intact.
- `ChartConfig.className` for CSS customisation of the chart root.
- `ThemeConfig.colors` aliases. `primary` maps to `accent`, and `background`,
  `surface`, `surfaceElevated`, `text`, `mutedText`, `border`, `grid`,
  `positive`, `warning`, `danger` and `info` map to the matching token names.
  Explicit token names take precedence.
- Structural configuration comparison in every React wrapper. `Chart`,
  `Dashboard`, `DashboardWidget`, `DataTable` and `Metric` skip engine updates
  when a parent re-renders with equal props.
- `chart-updates.html` example showing in-place chart updates, a custom chart
  class and the friendly dark-theme colour aliases.

### Changed

- Dashboard reconciliation now updates matching chart widgets in place instead
  of recreating them, preserving the chart instance across dashboard updates.
- The dashboard widget type exported from the React entry is now named
  `DashboardWidgetInfo` so the new `DashboardWidget` component can use the
  natural public name. The core entry continues to export the `DashboardWidget`
  type.
- Theme validation now reports `theme.colors.<name>` paths for invalid aliases.

### Verified

- 206 tests pass, including chart updates, className, theme colour aliases,
  React Chart SSR and updates, DashboardWidget standalone rendering, declarative
  dashboard children and stable prop updates.
- `npm run verify` covers type checking, linting, tests, production builds and a
  packed consumer fixture. The fixture verifies chart updates and colour
  aliases at runtime, server-renders `Chart` and `DashboardWidget`, and
  typechecks the new React declarations.
- Next.js App Router and Pages Router guidance was updated for the new
  components; all React components still defer DOM work to effects and never
  access `window` or `document` during server rendering.

### Compatibility

- No breaking changes to chart, table, metric, dashboard or existing React
  component APIs. `@munachi-me/numviz` remains the package name.

## [0.5.0] - 2026-11-26

### Added

- Dashboard composition engine with `createDashboard`. Dashboards combine
  charts, tables, metrics, headings, text, descriptions, dividers, images and
  explicit custom components.
- Per-component datasets: every dashboard widget owns its data and can use a
  different source, shape or column set. Metric widgets accept either `name` or
  `title`.
- Responsive grid layout with base, `sm`, `md`, `lg` and `xl` column counts,
  configurable breakpoints, explicit rows and automatic row sizing, column and
  row gaps, padding and alignment.
- Widget placement with column and row starts, column and row spans, ordering,
  width, height, minimum dimensions and self-alignment. Column placement is
  emitted per breakpoint and clamped to the active column count, so a wide
  component never creates implicit columns on a narrow screen.
- Dashboard `title`, `description`, `header`, `footer`, theme inheritance,
  background, global locale/currency formatting and dashboard-level widget style.
- Per-widget visual overrides for background, border, radius, padding, shadow and
  class names, kept separate from layout configuration.
- Dashboard lifecycle: `render`, `update`, `refresh`, `getWidget` and `destroy`.
  Updates reconcile widgets by id, preserve table and metric engines, recreate
  charts and destroy removed widgets.
- Unique scoped layout CSS per dashboard instance, preventing grid and breakpoint
  styles from leaking between dashboards.
- Safe custom component extension: callbacks return DOM nodes, plain text or
  `null`; returned strings are inserted as text and never parsed as HTML.
- React `Dashboard` component with server-rendering-safe host output, prop
  reconciliation and an imperative handle.
- `dashboard.html` example, dashboard API documentation, React integration
  guidance and root public API tests.

### Changed

- The frozen default namespace now includes `createDashboard` alongside
  `createChart`, `createTable`, `createMetric`, `version` and `NumvizError`.
- Dashboard theme tokens cascade into child widgets unless a widget supplies its
  own theme values; dashboard formatting supplies locale and currency defaults.

### Verified

- Dashboard tests cover composition, independent datasets, content and custom
  components, safe text handling, responsive layout and placement, theme and
  formatting inheritance, widget overrides, updates, table state preservation,
  refresh, teardown, re-rendering, style isolation and validation.
- React tests cover server rendering, mounting, prop reconciliation, individual
  component composition and dashboard teardown.
- The packed consumer test creates a dashboard without a DOM, verifies namespace
  equality and resolved layout/format, then separately server-renders the React
  dashboard and typechecks dashboard declarations.
- The dashboard example was rendered in a browser and checked for responsive
  cards, charts, metrics and table output.

### Compatibility

- No breaking changes to chart, table, metric or React component APIs.
  `@munachi-me/numviz` remains the package name.

## [0.4.1] - 2026-11-26

### Verified

- Audited the root entry point. `createChart`, `createTable` and `createMetric`
  are already exported as named exports and through the frozen default
  namespace, and both import styles reference the same functions. The namespace
  type is now checked against `NumvizNamespace` at compile time.
- Added root public API tests covering named imports, the default namespace,
  function-reference equality, the frozen namespace shape, `version`,
  `NumvizError` and typed chart, table and metric creation through both styles.
- Extended the packed-package consumer test to install React, import the React
  subpath separately, server-render `DataTable` and `Metric`, typecheck their
  declarations, and confirm that no core build file imports React.
- React tests now cover controlled table selection and verify that table and
  metric engines are destroyed when their components unmount.

### Fixed

- `scripts/consumer-test.mjs` previously stopped at root package imports and
  did not exercise the packaged React entry point. It now verifies the React
  subpath, server rendering and React declaration resolution.
- The default namespace is typed as `NumvizNamespace`, so a future missing
  factory function becomes a TypeScript error rather than a runtime-only
  regression.

### Compatibility

- No runtime API changes. `@munachi-me/numviz` remains the package name and the
  public factory functions, configuration and result types are unchanged.

## [0.4.0] - 2026-11-26

### Added

- Metric engine: `createMetric` computes sum, average, count, distinct count,
  minimum, maximum, median, percentage and custom aggregations from records,
  matrix data and dataset input, with callback or exact-match filters.
- Metric results expose the raw value, formatted value, aggregation, column,
  row and value counts, comparison details, direction, trend, semantic state
  and metadata. Calculations work without a DOM.
- Comparisons against another dataset or a fixed previous value, with
  difference, percentage change, growth, previous-period labels, zero-division
  handling, missing-value handling and lower-is-better direction support.
- KPI cards with title, value, description, prefix/suffix, number, currency,
  percent and compact formats, text or DOM icons, custom accent colours,
  comparison text, trend arrows and `default`, `compact`, `bordered` and
  `highlight` variants.
- Loading, empty and error appearances, plus `setData`, `setLoading`,
  `setError`, `refresh`, `update` and `destroy` lifecycle methods.
- Optional React `Metric` component with typed props and an imperative handle,
  plus Next.js server-rendering guidance.
- `metrics.html` example, metric API documentation and KPI/React tests.

### Changed

- The default namespace now includes `createMetric` alongside `createChart`,
  `createTable`, `version` and `NumvizError`.
- KPI cards share the existing theme tokens, including the semantic
  positive/warning/danger/info states and `surfaceElevated`.

### Verified

- Metric tests cover every aggregation, filters, invalid and missing values,
  comparisons, formatting, metadata, validation, KPI rendering, icons,
  cross-document icon nodes, loading/empty/error states, updates and teardown.
- React tests cover server rendering, mounting, prop updates, loading/error and
  inline styles.
- The packaged consumer test verifies metric calculations, formatting and the
  namespace export.

## [0.3.1] - 2026-11-26

### Fixed

- Tables with `pagination: false` now render every filtered and sorted row
  instead of only the first `pageSize` rows. `pageCount` stays at 1 in this mode.
- Search, sorting, row numbering, selection, select-all and status counts now
  behave consistently with pagination enabled and disabled.
- Page state clamps to a valid page when data shrinks or a search narrows the
  result set; `setPage`, `setData`, `setSearch` and `update` cannot leave the
  table on an empty page.
- Table cell renderers recognise DOM nodes across documents. Renderer nodes
  created inside an iframe are appended correctly instead of relying on the
  global `Node` constructor.
- `package-lock.json` is synchronized with `package.json`; the root package
  entry, version and dependency metadata now match, and `npm ci` succeeds from
  a clean install.

### Changed

- `responsive` now has a documented effect: `true` (default) stretches the
  table to its container and scrolls horizontally when content is wider;
  `false` sizes the table to its content without horizontal scrolling.
- `ThemeConfig` accepts `surfaceElevated`, `positive`, `warning`, `danger` and
  `info`, alongside the existing surface, text, border and accent tokens.
  Defaults, validation, CSS variables, charts and tables stay aligned.
- Historical changelog references use the official scoped package name.

### Added

- Regression tests for pagination enabled and disabled with datasets larger
  than ten rows, page clamping, per-page select-all, iframe renderer nodes,
  responsive/fixed table classes and extended theme tokens.
- Automated package consistency tests covering package name, version,
  lockfile metadata, current-version documentation and forbidden unscoped
  import paths.

## [0.3.0] - 2026-11-26

### Added

- HTML table engine: `createTable` renders a native, accessible `table` with
  automatic or configured columns, sorting, searching, pagination with
  page-size selection, row numbering, row selection, number/date formatting,
  custom formatters and renderers, and derived conditional columns.
- Table states and theming: minimal, striped, bordered, compact and dashboard
  variants, light/dark/system themes, sticky headers, max-height scrolling, and
  customizable empty, no-results, loading and error states.
- Table lifecycle API: `setData`, `setLoading`, `setError`, `setSort`,
  `setPage`, `setSearch`, `setSelection`, `getSelectedRows`, `getState`,
  `update` and `destroy`.
- Optional React entry `@munachi-me/numviz/react` with a typed `DataTable`
  component, uncontrolled and controlled state, callbacks and an imperative
  ref handle. React is an optional peer dependency (`>=18`).
- Next.js documentation covering the `"use client"` boundary, App Router and
  Pages Router usage, dynamic imports and server-rendering behaviour.
- Table examples (`examples/table.html`, `examples/table-themes.html`),
  table API documentation and React tests.

### Changed

- The default namespace now contains `createTable` alongside `createChart`,
  `version` and `NumvizError`.
- Table output renders only the current page, so large datasets never create a
  DOM row per record.
- String values and string renderer results are inserted as text, never HTML;
  renderers can return DOM nodes when markup is required.

### Verified

- Vanilla table tests cover structure, formatting, sorting, searching,
  pagination, states, derived columns, selection, themes, lifecycle, validation
  and iframes.
- React tests cover server rendering, mounting, controlled state, callbacks and
  loading/error props.
- The packaged consumer test verifies the table API and the `./react` subpath.

## [0.2.1] - 2026-11-26

### Added

- Cross-document rendering: charts use the target element's `ownerDocument` and
  `defaultView` for styles, SVG, `ResizeObserver`, `requestAnimationFrame` and
  system theme detection, enabling iframe and multi-document hosts.
- Runtime validation for theme tokens and palettes, series arrays, legend,
  labels, tooltip, animation, responsive and `onClick`/`tickFormat`/formatter
  callbacks, all reported with `INVALID_CONFIG` and a precise `path`.
- Regression tests for the build scripts, every validation rule, declared
  columns with missing records, ragged rows, missing cells and iframe rendering.

### Changed

- The build script uses `node scripts/clean.mjs` instead of Unix-only `rm -rf`,
  so builds run on Windows as well as macOS and Linux.
- Declared columns are preserved in their declared order even when records omit
  them; undeclared record keys follow the declared columns.
- Documentation now defines missing-cell handling for array-of-arrays rows.

### Fixed

- `theme.borderRadius: NaN` and infinite animation durations were accepted.
- Non-boolean `legend.show`, `labels.show`, `tooltip.show`, `animation.enabled`
  and `responsive` values were accepted.
- Non-function formatters and `onClick` handlers were accepted.
- Array-of-arrays rows longer than the declared columns silently dropped values;
  they now throw `INVALID_DATA` with row details.

## [0.2.0] - 2026-11-26

### Added

- New chart types: area, grouped bar, stacked bar, horizontal bar, scatter,
  histogram and radar.
- Multi-series support through `series` with per-series labels and colours.
- Axis configuration for titles, visibility, grid lines, tick rotation, tick
  formatting and numeric domain bounds.
- Interactive legends that toggle series visibility by pointer or keyboard.
- `chart.setSeriesVisible()` for programmatic series visibility.
- `onClick` mark activation with series context for pointer and keyboard users.
- Hover/focus highlighting that dims unrelated categories or series.
- Responsive layout: charts measure their container and re-render on resize,
  unless an explicit `width` is set.
- Label position control (`auto`, `inside`, `outside`) and animation
  configuration with reduced-motion support.
- Scatter support for numeric and date X fields, and configurable histogram bins.

### Changed

- Package name is now `@munachi-me/numviz` to match the npm publication target.
- Default chart width follows the render container instead of always using 720px.
- Tooltip formatters receive the series label in their context.
- Removed the development roadmap prompt file from the repository.

### Fixed

- Chart marks now dim reliably after they are attached to the DOM.
- Category tick labels no longer skip every other label when space is available.

## [0.1.0] - 2026-11-26

### Added

- TypeScript package with strict configuration, ESM output and generated declarations.
- Dual public API: default and named imports from `@munachi-me/numviz` share
  one implementation. (The package was published unscoped at the time and was
  scoped as `@munachi-me/numviz` in 0.2.0.)
- `createChart()` with validation and helpful `NumvizError` codes.
- Data normalization for arrays of objects, arrays of arrays with column
  definitions, and Numiq-compatible `{ columns, rows }` / `{ columns, data }` datasets.
- Numeric, date, boolean and string column inference; missing and invalid values
  become `null` without mutating source data.
- SVG renderers for bar, line, pie and doughnut charts.
- Titles, subtitles, legends, data labels, tooltips and configurable margins.
- Balanced default light/dark theme with design tokens, palette and CSS variable hooks.
- Vanilla rendering into a selector or DOM element with `render()` / `destroy()`.
- Keyboard-focusable marks, accessible SVG names and reduced-motion support.
- Examples for every chart type and data format.
- Tests, ESLint configuration, CI workflow and installed-package consumer test.
