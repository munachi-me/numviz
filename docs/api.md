# Numviz API reference — 0.1.0

## Entry points

```ts
import Numviz from "numviz";              // default namespace
import { createChart } from "numviz";     // named export
```

Both resolve to the same implementation. The default namespace is frozen and
contains `createChart`, `version` and `NumvizError`.

Type-only exports include `Chart`, `ChartConfig`, `ChartType`, `DataInput`,
`DataRecord`, `DataMatrixRow`, `DatasetLike`, `ColumnInput`,
`ColumnDefinition`, `ColumnType`, `NormalizedDataset`, `NormalizedRow`,
`NormalizedColumn`, `NormalizedValue`, `ResolvedChartConfig`, `ThemeConfig`,
`ThemeTokens`, `ThemeMode`, `LegendConfig`, `LegendPosition`, `LabelConfig`,
`TooltipConfig`, `TooltipContext`, `ValueFormatter`, `MarginConfig`,
`NumvizErrorCode` and `NumvizErrorOptions`.

## `createChart(config): Chart`

Validates the configuration, normalizes data and returns a chart instance.
Validation happens immediately; rendering happens in `render()`

### ChartConfig

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| `type` | `"bar" \| "line" \| "pie" \| "doughnut"` | required | Chart type |
| `data` | `DataInput` | required | Source data |
| `x` | `string` | required | Category field; alias `category` |
| `y` | `string` | required | Numeric value field; alias `value` |
| `columns` | `ColumnInput[]` | — | Column definitions for array-of-arrays data |
| `title` | `string` | — | Chart title |
| `subtitle` | `string` | — | Chart subtitle |
| `width` | `number` | `720` | SVG viewBox width |
| `height` | `number` | `380` | SVG viewBox height |
| `palette` | `string[]` | theme palette | Mark colours, cycled |
| `background` | `string` | theme background | Background override |
| `legend` | `boolean \| LegendConfig` | pie/doughnut `true` | Legend display |
| `labels` | `boolean \| LabelConfig` | `false` | Data labels |
| `tooltip` | `boolean \| TooltipConfig` | `true` | Tooltips |
| `margin` | `number \| Partial<MarginConfig>` | `16/20/44/56` | Plot margins |
| `theme` | `ThemeConfig` | light | Token overrides |
| `ariaLabel` | `string` | title or chart description | SVG accessible name |

### Chart instance

| Member | Description |
| --- | --- |
| `config` | Resolved configuration |
| `data` | Normalized, read-only dataset |
| `element` | Rendered root element or `null` |
| `isDestroyed` | Lifecycle flag |
| `render(target)` | Render into a selector or element; returns the chart |
| `destroy()` | Remove output, listeners and mark the chart destroyed |

Calling `render()` again removes the previous output before rendering into the
new target. Calling `render()` on a destroyed chart throws `DESTROYED`.

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

Normalization never mutates input. Each normalized row keeps a `source`
reference to the original record.

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

`ThemeConfig` accepts `mode`, `accent`, `fontFamily`, `borderRadius`,
`chartPalette`, `background`, `surface`, `text`, `mutedText`, `border` and
`grid`. Partial themes merge over built-in tokens.

Charts expose CSS custom properties (`--nv-*`) and documented class hooks so
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
`CONTAINER_NOT_FOUND`, `NO_DOM`, `DESTROYED`. Use `isNumvizError(error)` for
narrowing.

## Rendering model

- Charts are SVG with a fixed `viewBox` and a 100% width, so they scale with
  their container while preserving their aspect ratio.
- Titles, axes, legends, labels and tooltips are part of the chart output.
- Tooltips are HTML elements positioned over the chart root.
- Marks are focusable and expose `aria-label` values for keyboard and screen
  reader use.
- Styles are structural; colours come from theme tokens, so overrides do not
  leak between charts.
