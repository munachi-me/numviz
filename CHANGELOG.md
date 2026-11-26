# Changelog

All notable changes to Numviz are documented in this file.

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
