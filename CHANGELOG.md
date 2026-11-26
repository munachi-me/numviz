# Changelog

All notable changes to Numviz are documented in this file.

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
