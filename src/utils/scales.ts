export interface LinearScale {
  readonly min: number;
  readonly max: number;
  readonly scale: (value: number) => number;
  readonly ticks: readonly number[];
}

function niceStep(rawStep: number): number {
  const exponent = Math.floor(Math.log10(rawStep));
  const fraction = rawStep / 10 ** exponent;
  let niceFraction: number;
  if (fraction <= 1) niceFraction = 1;
  else if (fraction <= 2) niceFraction = 2;
  else if (fraction <= 2.5) niceFraction = 2.5;
  else if (fraction <= 5) niceFraction = 5;
  else niceFraction = 10;
  return niceFraction * 10 ** exponent;
}

/** Build a linear scale from a data range to a pixel range, including zero. */
export function linearScale(
  values: readonly number[],
  rangeStart: number,
  rangeEnd: number,
  tickCount = 5
): LinearScale {
  const finite = values.filter((value) => Number.isFinite(value));
  let min = finite.length > 0 ? Math.min(...finite, 0) : 0;
  let max = finite.length > 0 ? Math.max(...finite, 0) : 1;
  if (min === max) {
    if (max === 0) max = 1;
    else {
      min = Math.min(0, max);
      max = Math.max(0, max);
      if (min === max) max = min + 1;
    }
  }

  const step = niceStep((max - min) / Math.max(1, tickCount));
  const niceMin = Math.floor(min / step) * step;
  const niceMax = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  const scaleValue = (value: number): number => {
    const ratio = (value - niceMin) / (niceMax - niceMin || 1);
    return rangeStart + ratio * (rangeEnd - rangeStart);
  };

  for (let value = niceMin; value <= niceMax + step / 2; value += step) {
    ticks.push(Math.abs(value) < step / 1e6 ? 0 : Number(value.toFixed(10)));
  }

  return { min: niceMin, max: niceMax, scale: scaleValue, ticks };
}

export interface BandScale {
  readonly bandwidth: number;
  readonly step: number;
  readonly x: (index: number) => number;
}

/** Build a band scale across the given pixel range. */
export function bandScale(
  count: number,
  rangeStart: number,
  rangeEnd: number,
  paddingRatio = 0.24
): BandScale {
  const span = Math.max(0, rangeEnd - rangeStart);
  const step = count > 0 ? span / count : 0;
  const bandwidth = step * (1 - paddingRatio);
  return {
    bandwidth,
    step,
    x: (index: number) => rangeStart + index * step + (step - bandwidth) / 2
  };
}

/** Truncate a label with an ellipsis so it fits a maximum width. */
export function truncateLabel(label: string, maxChars: number): string {
  if (maxChars <= 1) return "";
  return label.length > maxChars ? `${label.slice(0, Math.max(1, maxChars - 1))}…` : label;
}

/** Approximate character capacity for a horizontal label at a given font size. */
export function labelCapacity(width: number, fontSize = 11): number {
  return Math.max(1, Math.floor(width / (fontSize * 0.58)));
}
