# Accessibility

Numviz aims to make charts and tables usable with a keyboard and screen reader,
not only with a mouse.

## Charts

- The chart SVG has `role="img"`, an `aria-label`, a `<title>` and a `<desc>`.
  The description includes the chart type, fields, point count and series.
- `chart.getSummary()` returns the same description as plain text.
- Marks with tooltips are focusable and expose `aria-label` values.
- Marks with click handlers use `role="button"` and respond to Enter and Space.
- Legend items are keyboard focusable and toggle series with Enter or Space.
- `chart.setSelectedIndex()` updates `aria-pressed` on the selected mark.
- Animations are disabled when the user prefers reduced motion.

## Tables

- Tables use native `table`, `thead`, `tbody`, `th` and `td` elements.
- The caption is available to assistive technology even when visually hidden.
- Column headers use `scope="col"`; sortable headers expose `aria-sort`.
- Selection checkboxes and pagination controls have explicit labels.
- Loading, empty and error states use a polite live region.
- Sort and pagination controls have visible focus styles.

## Dashboards and reports

- Filters use native form controls with associated labels.
- Filter chips and clear buttons have accessible names and focus styles.
- Printing hides interactive controls and avoids splitting widgets across
  pages.
- Reports preserve the dashboard heading hierarchy and report metadata.

## Testing

Accessibility behaviour is covered by the test suite, including chart
descriptions, selected-point announcements, table semantics, focusable marks
and reduced-motion styles. Applications should still test their own content,
labels and colour contrast with real assistive technology.
