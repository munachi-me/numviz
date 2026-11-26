/** Structural table styles. Colours come from theme custom properties. */
export const TABLE_STYLE_ID = "numviz-table-styles";

export const TABLE_CSS = `
.numviz-table { position: relative; color: var(--nv-text); background: var(--nv-background); font-family: var(--nv-font-family); border-radius: var(--nv-radius); }
.numviz-table__title { margin: 0 0 10px; font-size: 15px; font-weight: 650; letter-spacing: -0.01em; color: var(--nv-text); }
.numviz-table__toolbar { display: flex; gap: 12px; align-items: center; justify-content: space-between; flex-wrap: wrap; padding: 10px 12px; border: 1px solid var(--nv-border); border-bottom: none; border-radius: var(--nv-radius) var(--nv-radius) 0 0; background: var(--nv-surface); }
.numviz-table__toolbar-group { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.numviz-table__search { position: relative; display: flex; align-items: center; }
.numviz-table__search input, .numviz-table__search-input { width: min(260px, 60vw); padding: 7px 10px; font: inherit; font-size: 12.5px; color: var(--nv-text); background: var(--nv-background); border: 1px solid var(--nv-border); border-radius: max(6px, calc(var(--nv-radius) - 4px)); outline: none; }
.numviz-table__search input::placeholder, .numviz-table__search-input::placeholder { color: var(--nv-muted-text); }
.numviz-table__search input:focus-visible, .numviz-table__search-input:focus-visible { border-color: var(--nv-accent); box-shadow: 0 0 0 2px color-mix(in srgb, var(--nv-accent) 22%, transparent); }
.numviz-table__control { padding: 6px 9px; font: inherit; font-size: 12px; color: var(--nv-text); background: var(--nv-background); border: 1px solid var(--nv-border); border-radius: max(6px, calc(var(--nv-radius) - 4px)); cursor: pointer; }
.numviz-table__control:hover:not(:disabled) { border-color: var(--nv-accent); }
.numviz-table__control:focus-visible { outline: 2px solid var(--nv-accent); outline-offset: 1px; }
.numviz-table__control:disabled { opacity: 0.45; cursor: not-allowed; }
.numviz-table__viewport { position: relative; overflow: auto; border: 1px solid var(--nv-border); background: var(--nv-surface); }
.numviz-table--responsive .numviz-table__viewport { overflow-x: auto; }
.numviz-table--responsive .numviz-table__table { width: 100%; min-width: 100%; }
.numviz-table--fixed .numviz-table__viewport { overflow-x: visible; overflow-y: auto; }
.numviz-table--fixed .numviz-table__table { width: auto; min-width: 0; }
.numviz-table__table { border-collapse: separate; border-spacing: 0; font-size: 13px; }
.numviz-table__caption { caption-side: top; }
.numviz-table thead th { padding: 9px 12px; text-align: left; font-size: 11px; font-weight: 650; letter-spacing: 0.06em; text-transform: uppercase; color: var(--nv-muted-text); background: var(--nv-surface-elevated); border-bottom: 1px solid var(--nv-border); white-space: nowrap; }
.numviz-table--sticky-header thead th { position: sticky; top: 0; z-index: 2; }
.numviz-table tbody td { padding: 9px 12px; border-bottom: 1px solid var(--nv-grid); color: var(--nv-text); vertical-align: middle; }
.numviz-table tbody tr:last-child td { border-bottom: none; }
.numviz-table tbody tr { transition: background-color 120ms ease; }
.numviz-table tbody tr:hover { background: var(--nv-surface-elevated); }
.numviz-table tbody tr.numviz-table__row--selected { background: var(--nv-surface-elevated); box-shadow: inset 3px 0 0 var(--nv-accent); }
.numviz-table--striped tbody tr:nth-child(even) { background: var(--nv-surface-elevated); }
.numviz-table--striped tbody tr.numviz-table__row--selected { box-shadow: inset 3px 0 0 var(--nv-accent); }
.numviz-table__sort { display: inline-flex; align-items: center; gap: 6px; padding: 0; margin: 0; font: inherit; letter-spacing: inherit; text-transform: inherit; color: inherit; background: none; border: 0; cursor: pointer; }
.numviz-table__sort:hover { color: var(--nv-text); }
.numviz-table__sort:focus-visible { outline: 2px solid var(--nv-accent); outline-offset: 3px; border-radius: 3px; }
.numviz-table__sort-indicator { font-size: 9px; line-height: 1; color: var(--nv-muted-text); }
.numviz-table__sort-indicator--active { color: var(--nv-accent); }
.numviz-table__selection { width: 40px; }
.numviz-table__selection input { width: 15px; height: 15px; accent-color: var(--nv-accent); cursor: pointer; }
.numviz-table__row-number { width: 48px; color: var(--nv-muted-text); font-variant-numeric: tabular-nums; text-align: right; }
.numviz-table__empty, .numviz-table__loading { padding: 36px 16px; text-align: center; color: var(--nv-muted-text); }
.numviz-table__error { padding: 28px 16px; text-align: center; color: var(--nv-danger); }
.numviz-table__footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding: 9px 12px; border: 1px solid var(--nv-border); border-top: none; border-radius: 0 0 var(--nv-radius) var(--nv-radius); background: var(--nv-surface); color: var(--nv-muted-text); font-size: 12px; }
.numviz-table__pagination { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.numviz-table__page-status { font-variant-numeric: tabular-nums; }
.numviz-table__status { flex: 1 1 100%; order: 3; }
.numviz-table__status:empty { display: none; }
.numviz-table__footer-label { display: inline-flex; align-items: center; gap: 6px; }
.numviz-table--bordered .numviz-table__table thead th, .numviz-table--bordered .numviz-table__table tbody td { border: 1px solid var(--nv-border); }
.numviz-table--bordered .numviz-table__table tbody tr:last-child td { border-bottom: 1px solid var(--nv-border); }
.numviz-table--compact .numviz-table thead th, .numviz-table--compact .numviz-table tbody td { padding: 5px 9px; font-size: 12px; }
.numviz-table--dashboard { padding: 4px; background: var(--nv-surface); border: 1px solid var(--nv-border); border-radius: var(--nv-radius); box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06); }
.numviz-table--dashboard .numviz-table__toolbar, .numviz-table--dashboard .numviz-table__footer { background: transparent; border-left: none; border-right: none; }
.numviz-table--dashboard .numviz-table__viewport { border-left: none; border-right: none; }
.numviz-table--dashboard .numviz-table__toolbar { border-top: none; border-radius: 0; }
.numviz-table--dashboard .numviz-table__footer { border-bottom: none; border-radius: 0; }
.numviz-sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
@media (prefers-reduced-motion: reduce) {
  .numviz-table tbody tr { transition: none; }
}
`;
