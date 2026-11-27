# Migration guide

Numviz follows semantic versioning from `1.0.0`. This guide records the
changes that matter when upgrading between releases.

## 1.0.0 to 1.0.1

`1.0.1` is a maintenance release with no public API changes. CSV exports now
protect against spreadsheet formula injection by default. If a downstream tool
must receive formula-like text without the protective apostrophe, pass
`formulaProtection: false` to `table.toCSV()`. This is only appropriate for
trusted, non-spreadsheet consumers.

## 0.9.0 to 1.0.0

`1.0.0` is a production release with no breaking changes to the chart, table,
metric, dashboard, report or React APIs.

- `Chart.getSummary()` is new and additive. It returns a plain-text chart
  description for assistive technology, tests and exports.
- The chart SVG `<desc>` now contains the same data-aware summary instead of a
  generic sentence.
- PNG export resolves `Image`, `Blob` and `URL` from the chart document, so
  charts inside iframes and other documents export correctly.
- Standalone SVG export uses the configured chart background when the root has
  no `--nv-background` token.
- The package is prepared for npm publication as `@munachi-me/numviz`.

No migration is required for existing applications.

## 0.8.0 to 0.9.0

`0.9.0` is additive. Existing chart, table, metric and dashboard code continues
to work.

- Add `chart.toSVG()` or `chart.toPNG()` when you need image output.
- Add `table.toCSV()`, `table.toJSON()` or `table.toHTML()` for tabular output.
  Exports default to every filtered and sorted row; use `scope: "page"` for the
  current page.
- Add `dashboard.print()` or `DashboardConfig.print` for print-specific
  layouts.
- Replace custom report scaffolding with `createReport()` and `REPORT_PRESETS`
  when a preset fits.
- Review generated standalone dashboards. Data is now serialized with `<`
  escaped inside scripts.

## 0.7.0 to 0.8.0

`0.8.0` added dashboard filters, cross-filtering, selection, events and
serializable state. Dashboard updates preserve filters and selections when the
widget and field still exist. Custom filters must provide a render function and
cannot be used in standalone exports.

## 0.6.0 to 0.7.0

`0.7.0` added standalone dashboard export. Directory output and single-file
output are generated from Node.js. Custom dashboard components cannot be
serialized because their render functions are not portable.

## Deprecations

There are no deprecated public APIs in `1.0.0`. Future removals will be marked
in the changelog and this guide before the next major release.
