# Changelog

All notable changes to Numviz are documented in this file.

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
- Dual public API: `import Numviz from "numviz"` and named imports such as
  `import { createChart } from "numviz"` share one implementation.
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
