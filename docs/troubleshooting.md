# Troubleshooting

## A chart or table renders nothing

- Confirm the selector matches an element. Missing selectors throw
  `CONTAINER_NOT_FOUND`; invalid targets throw `INVALID_CONTAINER`.
- Rendering outside a DOM throws `NO_DOM`. Create charts and tables in a browser
  or a DOM implementation such as jsdom. Metrics compute without a DOM.
- Check the browser console for `NumvizError`. The error `path` identifies the
  invalid configuration field.
- An empty dataset is valid. Charts show an empty state instead of marks.

## Charts are too small or too wide

- Omit `width` to make a chart follow its container. The responsive chart uses a
  `ResizeObserver` when one is available.
- Set `width` and `height` when the chart is exported or embedded in a fixed
  layout.
- Parent containers must have a measurable width. A hidden `display: none`
  container has no width.

## PNG export fails

`chart.toPNG()` needs a rendered chart, `Image`, `Blob`, `URL` and canvas
support. It rejects with `EXPORT_FAILED` in Node.js, jsdom and browsers that
block canvas. Use `chart.toSVG()` for a portable vector export in those
environments.

## Standalone export fails

- `dashboard.export()` is Node-only. Use it in a build script, server action or
  CLI, not in browser code.
- Custom components and custom filters cannot be exported because their render
  functions are not serializable.
- External data mode writes `data/data.json` and fetches it at runtime. Serve
  the directory over HTTP; browsers block local JSON requests from `file://`.
- Single-file output requires `data: "embedded"`.

## Printing hides too much or too little

Use `DashboardConfig.print` to control filters, header and footer visibility:

```ts
const dashboard = createDashboard({
  ...config,
  print: { hideFilters: false, hideHeader: true, hideFooter: true }
});
```

Set `print: false` to disable print classes. The generated standalone page still
includes base print styles so shared dashboards print cleanly.

## React renders an empty host element

React components render a host element and attach the vanilla engine after
mounting. During server rendering, only the host element is emitted. This is
intentional and prevents DOM access during SSR. Check that the component is
mounted in the browser before inspecting chart or table markup.

## Tables become slow with very large datasets

Tables render only the current page when pagination is enabled. Keep
pagination on for large datasets, or pass a pre-aggregated dataset. Sorting and
searching still operate on the full normalized row list. Export uses the same
filtered and sorted rows.

## Large charts produce many DOM nodes

Every visible point is an SVG mark. For very dense series, aggregate or sample
the data before rendering, or disable labels and tooltips. Charts with thousands
of marks remain functional but can be expensive to animate or export.

## A report title is missing

`createReport()` uses `metadata.title` when `title` is absent. A report with no
metadata title and no title uses the preset title. If a title is an empty string,
configuration validation throws `INVALID_CONFIG`.

## Focus or screen-reader output is unclear

- Charts expose `role="img"`, `aria-label`, `<title>` and `<desc>`. Use
  `chart.getSummary()` for the same description in tests or custom UI.
- Table headers use `scope="col"`, sortable headers expose `aria-sort`, and
  status updates use a polite live region.
- Provide `ariaLabel`, `title` and `caption` values that describe the data
  rather than repeating generic component names.
- Chart marks and legend items are keyboard focusable. Press Enter or Space to
  activate a click handler.

## Need more detail

Open an issue at
[github.com/munachi-me/numviz/issues](https://github.com/munachi-me/numviz/issues)
with the Numviz version, environment and a minimal configuration.
