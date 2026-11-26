import type { NormalizedDataset, ResolvedChartConfig, ThemeTokens } from "../types.js";

/** Internal context passed to chart renderers. */
export interface RenderContext {
  readonly doc: Document;
  readonly root: HTMLElement;
  readonly config: ResolvedChartConfig;
  readonly data: NormalizedDataset;
  readonly tokens: ThemeTokens;
  onCleanup(cleanup: () => void): void;
}

export interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly right: number;
  readonly bottom: number;
}

export function box(x: number, y: number, width: number, height: number): Box {
  return { x, y, width, height, right: x + width, bottom: y + height };
}

/** Read a normalized cell value from a row. */
export function valueOf(row: { readonly values: Readonly<Record<string, unknown>> }, field: string): unknown {
  return row.values[field] ?? null;
}
