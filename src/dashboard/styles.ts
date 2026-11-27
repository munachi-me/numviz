import type {
  DashboardAlignment,
  DashboardComponent,
  DashboardComponentLayout,
  DashboardWidgetShadow,
  DashboardWidgetStyle,
  ResolvedDashboardLayout
} from "./types.js";

const SHADOWS: Record<DashboardWidgetShadow, string> = {
  none: "none",
  sm: "0 1px 2px rgb(15 23 42 / 6%)",
  md: "0 4px 12px rgb(15 23 42 / 10%)",
  lg: "0 12px 32px rgb(15 23 42 / 16%)"
};

const ALIGN_SELF: Record<DashboardAlignment, string> = {
  start: "start",
  center: "center",
  end: "end",
  stretch: "stretch"
};

export function dashboardStyleId(scope: string): string {
  return `${scope}-styles`;
}

function clamp(value: number, columns: number): number {
  return Math.max(1, Math.min(value, columns));
}

function placementRules(
  scope: string,
  components: readonly DashboardComponent[],
  columns: number
): string {
  const rules: string[] = [];
  components.forEach((component, index) => {
    const layout = component.layout;
    if (!layout) return;
    let placement = "";
    if (layout.column !== undefined) {
      const start = clamp(layout.column, columns);
      const span = clamp(layout.columnSpan ?? 1, columns - start + 1);
      placement = `${start} / span ${span}`;
    } else if (layout.columnSpan !== undefined) {
      placement = `span ${clamp(layout.columnSpan, columns)}`;
    }
    if (placement) {
      rules.push(
        `  .${scope} .numviz-dashboard__grid > [data-nv-slot="${index}"] { grid-column: ${placement}; }`
      );
    }
  });
  return rules.join("\n");
}

/** Scoped CSS for one dashboard instance. All selectors include `scope`. */
export function dashboardCss(
  scope: string,
  layout: ResolvedDashboardLayout,
  components: readonly DashboardComponent[] = []
): string {
  const selector = `.numviz-root.${scope}`;
  const grid = `.${scope} .numviz-dashboard__grid`;
  const basePlacement = placementRules(scope, components, layout.columns.base);
  const media: string[] = [];
  const breakpoints = layout.breakpoints;
  for (const name of ["sm", "md", "lg", "xl"] as const) {
    const placement = placementRules(scope, components, layout.columns[name]);
    media.push(
      `@media (min-width: ${breakpoints[name]}px) { ${grid} { grid-template-columns: repeat(${layout.columns[name]}, minmax(0, 1fr)); }${placement ? `\n${placement}` : ""} }`
    );
  }
  return `${selector} {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: none;
  min-width: 0;
  overflow: visible;
  color: var(--nv-text);
  background: var(--nv-background);
}
${selector} .numviz-dashboard__header {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
${selector} .numviz-dashboard__logo {
  width: 36px;
  height: 36px;
  object-fit: contain;
  border-radius: 8px;
}
${selector} .numviz-dashboard__title {
  margin: 0;
  font-size: 24px;
  line-height: 1.25;
  font-weight: 700;
  letter-spacing: -0.015em;
  color: var(--nv-text);
}
${selector} .numviz-dashboard__description {
  margin: 0;
  max-width: 72ch;
  font-size: 13px;
  line-height: 1.55;
  color: var(--nv-muted-text);
}
${selector} .numviz-dashboard__header-text,
${selector} .numviz-dashboard__footer {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--nv-muted-text);
}
${selector} .numviz-dashboard__filters {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 10px 12px;
  padding: 12px 14px;
  background: var(--nv-surface);
  border: 1px solid var(--nv-border);
  border-radius: var(--nv-radius);
}
${selector} .numviz-dashboard__filter {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 150px;
}
${selector} .numviz-dashboard__filter-label {
  font-size: 10px;
  font-weight: 650;
  line-height: 1.3;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--nv-muted-text);
}
${selector} .numviz-dashboard__filter-control {
  width: 100%;
  min-width: 150px;
  min-height: 34px;
  padding: 6px 9px;
  color: var(--nv-text);
  background: var(--nv-background);
  border: 1px solid var(--nv-border);
  border-radius: calc(var(--nv-radius) - 4px);
  font: inherit;
  font-size: 13px;
}
${selector} select.numviz-dashboard__filter-control[multiple] {
  min-height: 82px;
}
${selector} .numviz-dashboard__filter-control:focus-visible {
  outline: 2px solid var(--nv-accent);
  outline-offset: 1px;
}
${selector} .numviz-dashboard__filter-range {
  display: flex;
  gap: 6px;
}
${selector} .numviz-dashboard__filter-range .numviz-dashboard__filter-control {
  min-width: 0;
}
${selector} .numviz-dashboard__filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 30px;
  padding: 4px 6px 4px 10px;
  font-size: 12px;
  color: var(--nv-text);
  background: var(--nv-surface-elevated);
  border: 1px solid var(--nv-border);
  border-radius: 999px;
}
${selector} .numviz-dashboard__filter-chip-clear,
${selector} .numviz-dashboard__filter-clear {
  min-height: 30px;
  padding: 4px 10px;
  color: var(--nv-muted-text);
  background: transparent;
  border: 1px solid var(--nv-border);
  border-radius: calc(var(--nv-radius) - 4px);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}
${selector} .numviz-dashboard__filter-chip-clear {
  min-width: 22px;
  min-height: 22px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  font-size: 16px;
  line-height: 1;
}
${selector} .numviz-dashboard__filter-chip-clear:hover,
${selector} .numviz-dashboard__filter-clear:hover {
  color: var(--nv-text);
  border-color: var(--nv-accent);
}
${selector} .numviz-dashboard__filter-chip-clear:focus-visible,
${selector} .numviz-dashboard__filter-clear:focus-visible {
  outline: 2px solid var(--nv-accent);
  outline-offset: 2px;
}
${grid} {
  display: grid;
  grid-template-columns: repeat(${layout.columns.base}, minmax(0, 1fr));
  min-width: 0;
}
${basePlacement ? `${basePlacement}\n` : ""}${media.join("\n")}
.${scope} .numviz-dashboard__widget {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  padding: 20px;
  background: var(--nv-surface);
  border: 1px solid var(--nv-border);
  border-radius: var(--nv-radius);
  box-shadow: ${SHADOWS.sm};
  overflow: hidden;
}
.${scope} .numviz-dashboard__widget--content,
.${scope} .numviz-dashboard__widget--media {
  padding: 0;
  background: transparent;
  border: 0;
  border-radius: 0;
  box-shadow: none;
  overflow: visible;
}
.${scope} .numviz-dashboard__body {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}
.${scope} .numviz-dashboard__body > .numviz-root {
  flex: 1 1 auto;
  min-width: 0;
  background: transparent;
  border-radius: 0;
  overflow: visible;
}
.${scope} .numviz-dashboard__body .numviz-chart__empty {
  background: transparent;
}
.${scope} .numviz-dashboard__heading {
  margin: 0;
  color: var(--nv-text);
  font-weight: 650;
  line-height: 1.25;
  letter-spacing: -0.01em;
}
.${scope} .numviz-dashboard__heading[data-level="1"] { font-size: 24px; }
.${scope} .numviz-dashboard__heading[data-level="2"] { font-size: 20px; }
.${scope} .numviz-dashboard__heading[data-level="3"] { font-size: 18px; }
.${scope} .numviz-dashboard__heading[data-level="4"] { font-size: 16px; }
.${scope} .numviz-dashboard__heading[data-level="5"] { font-size: 14px; }
.${scope} .numviz-dashboard__heading[data-level="6"] {
  font-size: 12px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--nv-muted-text);
}
.${scope} .numviz-dashboard__text {
  margin: 0;
  font-size: 13px;
  line-height: 1.65;
  white-space: pre-wrap;
  color: var(--nv-text);
}
.${scope} .numviz-dashboard__description-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.65;
  white-space: pre-wrap;
  color: var(--nv-muted-text);
}
.${scope} .numviz-dashboard__divider {
  width: 100%;
  margin: 0;
  border: 0;
  border-top: 1px solid var(--nv-border);
}
.${scope} .numviz-dashboard__figure {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  min-width: 0;
}
.${scope} .numviz-dashboard__image {
  display: block;
  max-width: 100%;
  border-radius: calc(var(--nv-radius) - 4px);
}
.${scope} .numviz-dashboard__caption {
  font-size: 12px;
  line-height: 1.45;
  color: var(--nv-muted-text);
}
.${scope} .numviz-dashboard__custom {
  min-width: 0;
}
.${selector}.numviz-dashboard--compact .numviz-dashboard__widget {
  padding: 14px;
}
${selector}.numviz-dashboard--flush .numviz-dashboard__widget {
  padding: 0;
  background: transparent;
  border: 0;
  border-radius: 0;
  box-shadow: none;
  overflow: visible;
}
.${selector}.numviz-dashboard--flush .numviz-dashboard__widget > .numviz-dashboard__body > .numviz-root {
  background: transparent;
}
@media (prefers-reduced-motion: reduce) {
  ${selector} .numviz-dashboard__widget {
    transition: none;
  }
}
`;
}

export function applyWidgetStyle(
  element: HTMLElement,
  globalStyle: DashboardWidgetStyle,
  widgetStyle: DashboardWidgetStyle | undefined
): void {
  const style = { ...globalStyle, ...(widgetStyle ?? {}) };
  if (style.background) element.style.background = style.background;
  if (style.border) element.style.border = style.border;
  if (style.borderRadius !== undefined) {
    element.style.borderRadius = String(style.borderRadius);
  }
  if (style.padding !== undefined) element.style.padding = String(style.padding);
  if (style.boxShadow !== undefined) element.style.boxShadow = SHADOWS[style.boxShadow];
  if (style.className) element.classList.add(...style.className.split(/\s+/).filter(Boolean));
}

export function applyWidgetLayout(
  element: HTMLElement,
  layout: DashboardComponentLayout | undefined
): void {
  if (!layout) return;
  if (layout.row !== undefined) {
    element.style.gridRow = `${layout.row} / span ${layout.rowSpan ?? 1}`;
  } else if (layout.rowSpan !== undefined) {
    element.style.gridRow = `span ${layout.rowSpan}`;
  }
  if (layout.order !== undefined) element.style.order = String(layout.order);
  if (layout.width !== undefined) element.style.width = String(layout.width);
  if (layout.height !== undefined) element.style.height = String(layout.height);
  if (layout.minWidth !== undefined) element.style.minWidth = String(layout.minWidth);
  if (layout.minHeight !== undefined) element.style.minHeight = String(layout.minHeight);
  if (layout.align !== undefined) element.style.alignSelf = ALIGN_SELF[layout.align];
}
