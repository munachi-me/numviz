# Changelog

All notable changes to Numviz are documented in this file.

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
