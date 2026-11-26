import type {
  NormalizedDataset,
  ResolvedChartConfig,
  ResolvedSeries,
  ThemeTokens
} from "../types.js";

/** Internal context passed to chart renderers. */
export interface RenderContext {
  readonly doc: Document;
  readonly root: HTMLElement;
  readonly config: ResolvedChartConfig;
  readonly data: NormalizedDataset;
  readonly tokens: ThemeTokens;
  readonly hiddenSeries: ReadonlySet<number>;
  toggleSeries(index: number): void;
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

/** Series that are currently shown. */
export function visibleSeries(ctx: RenderContext): readonly ResolvedSeries[] {
  return ctx.config.series.filter((series) => !ctx.hiddenSeries.has(series.index));
}
