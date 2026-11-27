import { NumvizError } from "../errors.js";
import type { Chart, ChartExportOptions, ChartPNGExportOptions } from "../types.js";
import { BASE_CSS } from "../utils/dom.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const TOKEN_NAMES = [
  "--nv-background",
  "--nv-surface",
  "--nv-surface-elevated",
  "--nv-text",
  "--nv-muted-text",
  "--nv-border",
  "--nv-grid",
  "--nv-accent",
  "--nv-positive",
  "--nv-warning",
  "--nv-danger",
  "--nv-info",
  "--nv-font-family",
  "--nv-radius"
] as const;

function positive(value: unknown, name: string): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new NumvizError(`\`${name}\` must be a positive finite number.`, {
      code: "INVALID_CONFIG",
      path: name,
      details: { received: value }
    });
  }
  return value;
}

function svgDimensions(
  svg: SVGSVGElement,
  chart: Chart,
  options: ChartExportOptions
): { width: number; height: number } {
  const viewBox = svg.getAttribute("viewBox")?.trim().split(/\s+/).map(Number);
  const baseWidth =
    Number(svg.getAttribute("width")) ||
    (viewBox && viewBox.length === 4 ? viewBox[2] : undefined) ||
    chart.config.width;
  const baseHeight =
    Number(svg.getAttribute("height")) ||
    (viewBox && viewBox.length === 4 ? viewBox[3] : undefined) ||
    chart.config.height;
  const widthOption = positive(options.width, "width");
  const heightOption = positive(options.height, "height");
  const scale = positive(options.scale, "scale") ?? 1;
  const width = widthOption ?? Math.round(baseWidth * scale);
  const height =
    heightOption ??
    (widthOption !== undefined
      ? Math.round((widthOption / baseWidth) * baseHeight)
      : Math.round(baseHeight * scale));
  return { width, height };
}

/** Serialize a rendered chart to a standalone SVG document string. */
export function chartToSVG(chart: Chart, options: ChartExportOptions = {}): string {
  if (chart.isDestroyed) {
    throw new NumvizError("This chart has been destroyed and cannot be exported.", {
      code: "DESTROYED"
    });
  }
  const root = chart.element;
  const svg = root?.querySelector<SVGSVGElement>("svg.numviz-chart__svg");
  if (!root || !svg) {
    throw new NumvizError("Render the chart before exporting it.", {
      code: "EXPORT_FAILED"
    });
  }
  const doc = svg.ownerDocument;
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const { width, height } = svgDimensions(svg, chart, options);
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));
  clone.style.width = `${width}px`;
  clone.style.height = `${height}px`;
  if (!clone.getAttribute("viewBox")) {
    clone.setAttribute("viewBox", `0 0 ${width} ${height}`);
  }
  for (const name of TOKEN_NAMES) {
    const value = root.style.getPropertyValue(name);
    if (value) clone.style.setProperty(name, value);
  }
  clone.style.setProperty("--nv-animation-duration", "0ms");
  const style = doc.createElementNS(SVG_NS, "style");
  style.textContent = BASE_CSS;
  clone.insertBefore(style, clone.firstChild);
  const background =
    options.background ??
    clone.style.getPropertyValue("--nv-background") ??
    chart.config.background;
  if (background) {
    const rect = doc.createElementNS(SVG_NS, "rect");
    rect.setAttribute("x", "0");
    rect.setAttribute("y", "0");
    rect.setAttribute("width", "100%");
    rect.setAttribute("height", "100%");
    rect.setAttribute("fill", background);
    clone.insertBefore(rect, style.nextSibling);
  }
  const Serializer =
    (doc.defaultView as (Window & { XMLSerializer?: typeof XMLSerializer }) | null)?.XMLSerializer ??
    XMLSerializer;
  return new Serializer().serializeToString(clone);
}

/** Rasterize a rendered chart to PNG in a browser. */
export async function chartToPNG(
  chart: Chart,
  options: ChartPNGExportOptions = {}
): Promise<Blob> {
  if (options.quality !== undefined && (options.quality < 0 || options.quality > 1)) {
    throw new NumvizError("`quality` must be between 0 and 1.", {
      code: "INVALID_CONFIG",
      path: "quality"
    });
  }
  const svg = chartToSVG(chart, options);
  const root = chart.element;
  const doc = root?.ownerDocument;
  const view = doc?.defaultView;
  const ImageCtor = (view as (Window & { Image?: typeof Image }) | null)?.Image ??
    (globalThis as typeof globalThis & { Image?: typeof Image }).Image;
  const URLImpl = (view as (Window & { URL?: typeof URL }) | null)?.URL ?? globalThis.URL;
  if (!doc || typeof ImageCtor !== "function" || typeof URLImpl?.createObjectURL !== "function") {
    throw new NumvizError("PNG chart export requires a browser image and canvas runtime.", {
      code: "EXPORT_FAILED"
    });
  }
  const canvas = doc.createElement("canvas");
  let context: CanvasRenderingContext2D | null = null;
  try {
    context = canvas.getContext("2d");
  } catch {
    context = null;
  }
  if (!context || typeof canvas.toBlob !== "function") {
    throw new NumvizError("PNG chart export requires canvas support.", {
      code: "EXPORT_FAILED"
    });
  }
  const dimensions = svgDimensions(
    root.querySelector<SVGSVGElement>("svg.numviz-chart__svg") as SVGSVGElement,
    chart,
    options
  );
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;
  const url = URLImpl.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new ImageCtor();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Unable to load the chart SVG."));
      element.src = url;
    });
    context.drawImage(image, 0, 0, dimensions.width, dimensions.height);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Canvas returned no PNG data."))),
        "image/png",
        options.quality ?? 1
      );
    });
  } catch (error) {
    throw new NumvizError("Unable to create a PNG chart export.", {
      code: "EXPORT_FAILED",
      cause: error
    });
  } finally {
    URLImpl.revokeObjectURL(url);
  }
}
