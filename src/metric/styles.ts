/** Structural KPI card styles. Colours come from theme custom properties. */
export const METRIC_STYLE_ID = "numviz-metric-styles";

export const METRIC_CSS = `
.numviz-root.numviz-metric {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 18px 20px;
  background: var(--nv-surface);
  border: 1px solid var(--nv-border);
  border-radius: var(--nv-radius);
  overflow: visible;
}
.numviz-metric__header { display: flex; align-items: center; gap: 8px; min-width: 0; }
.numviz-metric__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 24px;
  height: 24px;
  font-size: 14px;
  line-height: 1;
  color: var(--nv-metric-accent, var(--nv-accent));
  background: var(--nv-surface-elevated);
  border-radius: max(5px, calc(var(--nv-radius) - 8px));
}
.numviz-metric__icon svg { width: 16px; height: 16px; display: block; }
.numviz-metric__title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  font-weight: 650;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--nv-muted-text);
}
.numviz-metric__value-row {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 4px;
  min-width: 0;
}
.numviz-metric__value {
  font-size: 30px;
  line-height: 1.08;
  font-weight: 700;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  color: var(--nv-metric-accent, var(--nv-text));
}
.numviz-metric__prefix,
.numviz-metric__suffix { font-size: 14px; color: var(--nv-muted-text); }
.numviz-metric__empty { font-size: 14px; font-weight: 500; color: var(--nv-muted-text); }
.numviz-metric__description {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--nv-muted-text);
}
.numviz-metric__comparison {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 5px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--nv-muted-text);
}
.numviz-metric__comparison[data-state="positive"] { color: var(--nv-positive); }
.numviz-metric__comparison[data-state="negative"] { color: var(--nv-danger); }
.numviz-metric__trend { font-size: 11px; line-height: 1; }
.numviz-metric__change { font-weight: 650; }
.numviz-metric__comparison-label { color: var(--nv-muted-text); }
.numviz-metric__comparison-value {
  color: var(--nv-muted-text);
  font-variant-numeric: tabular-nums;
}
.numviz-metric__error {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--nv-danger);
}
.numviz-root.numviz-metric--compact { padding: 12px 14px; gap: 4px; }
.numviz-metric--compact .numviz-metric__value { font-size: 22px; }
.numviz-metric--compact .numviz-metric__description { font-size: 11px; }
.numviz-root.numviz-metric--bordered { background: transparent; border-width: 2px; }
.numviz-root.numviz-metric--highlight {
  background: linear-gradient(135deg, var(--nv-surface), var(--nv-surface-elevated));
  border-left: 3px solid var(--nv-metric-accent, var(--nv-accent));
}
.numviz-metric--loading .numviz-metric__value { color: var(--nv-muted-text); animation: numviz-metric-pulse 1.2s ease-in-out infinite; }
.numviz-metric--empty .numviz-metric__value { color: var(--nv-muted-text); }
@keyframes numviz-metric-pulse { 0%, 100% { opacity: 0.45; } 50% { opacity: 1; } }
@media (prefers-reduced-motion: reduce) {
  .numviz-metric--loading .numviz-metric__value { animation: none; }
}
`;
