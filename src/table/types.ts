import type { ColumnType, DataInput, ThemeConfig } from "../types.js";
import type {
  TableCSVExportOptions,
  TableHTMLExportOptions,
  TableJSONExportOptions
} from "../export/types.js";

/** Visual variants built into the table renderer. */
export type TableVariant = "minimal" | "striped" | "bordered" | "compact" | "dashboard";

export type TableAlign = "left" | "center" | "right";
export type TableSortDirection = "asc" | "desc";
export type TableFormatPreset = "text" | "number" | "currency" | "percent" | "date";

/** A row exposed to formatters, renderers and selection callbacks. */
export type TableRow = Readonly<Record<string, unknown>>;

export interface TableSortState {
  readonly field: string;
  readonly direction: TableSortDirection;
}

export interface TableCellContext {
  readonly rowIndex: number;
  readonly row: TableRow;
  readonly column: ResolvedTableColumn;
}

export type TableFormatter = (
  value: unknown,
  row: TableRow,
  column: ResolvedTableColumn
) => string;

export type TableCellRenderer = (
  row: TableRow,
  context: TableCellContext
) => Node | string | number | bigint | null | undefined;

export interface TableColumnConfig {
  /** Field in the data. Optional for computed columns that only provide `render`. */
  field?: string;
  /** Alias for `field`. */
  key?: string;
  label?: string;
  type?: ColumnType;
  visible?: boolean;
  width?: number | string;
  align?: TableAlign;
  format?: TableFormatPreset | TableFormatter;
  formatOptions?: Intl.NumberFormatOptions | Intl.DateTimeFormatOptions;
  currency?: string;
  render?: TableCellRenderer;
  /** Accessor for computed columns; used for sorting, searching and formatting. */
  value?: (row: TableRow) => unknown;
  sortable?: boolean;
  searchable?: boolean;
  className?: string;
  headerClassName?: string;
}

export interface TableConfig {
  data: DataInput;
  columns?: readonly (string | TableColumnConfig)[];
  sortable?: boolean;
  defaultSort?: TableSortState | { field: string; direction?: TableSortDirection } | null;
  onSortChange?: (sort: TableSortState | null) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  onSearchChange?: (query: string) => void;
  pagination?: boolean;
  pageSize?: number;
  pageSizeOptions?: readonly number[];
  onPageChange?: (page: number) => void;
  rowNumbers?: boolean;
  selectable?: boolean;
  selectedRows?: readonly number[];
  onSelectionChange?: (indices: readonly number[], rows: readonly TableRow[]) => void;
  loading?: boolean;
  loadingMessage?: string;
  error?: string | null;
  emptyMessage?: string;
  noResultsMessage?: string;
  striped?: boolean;
  stickyHeader?: boolean;
  maxHeight?: number | string;
  variant?: TableVariant;
  locale?: string;
  theme?: ThemeConfig;
  className?: string;
  title?: string;
  caption?: string;
  ariaLabel?: string;
  responsive?: boolean;
}

export interface ResolvedTableColumn {
  readonly index: number;
  readonly field: string;
  readonly label: string;
  readonly type: ColumnType;
  readonly visible: boolean;
  readonly width?: string;
  readonly align: TableAlign;
  readonly format?: TableFormatPreset | TableFormatter;
  readonly formatOptions?: Intl.NumberFormatOptions | Intl.DateTimeFormatOptions;
  readonly currency?: string;
  readonly render?: TableCellRenderer;
  readonly value?: (row: TableRow) => unknown;
  readonly sortable: boolean;
  readonly searchable: boolean;
  readonly className?: string;
  readonly headerClassName?: string;
}

export interface ResolvedTableConfig {
  readonly columns: readonly ResolvedTableColumn[];
  readonly sortable: boolean;
  readonly searchable: boolean;
  readonly searchPlaceholder: string;
  readonly defaultSort: TableSortState | null;
  readonly selectedRows: readonly number[];
  readonly pagination: boolean;
  readonly pageSize: number;
  readonly pageSizeOptions: readonly number[];
  readonly rowNumbers: boolean;
  readonly selectable: boolean;
  readonly loading: boolean;
  readonly loadingMessage: string;
  readonly error: string | null;
  readonly emptyMessage: string;
  readonly noResultsMessage: string;
  readonly striped: boolean;
  readonly stickyHeader: boolean;
  readonly maxHeight?: string;
  readonly variant: TableVariant;
  readonly locale: string;
  readonly theme: ThemeConfig;
  readonly className?: string;
  readonly title?: string;
  readonly caption?: string;
  readonly ariaLabel?: string;
  readonly responsive: boolean;
  readonly onSortChange?: (sort: TableSortState | null) => void;
  readonly onSearchChange?: (query: string) => void;
  readonly onPageChange?: (page: number) => void;
  readonly onSelectionChange?: (
    indices: readonly number[],
    rows: readonly TableRow[]
  ) => void;
}

export interface TableData {
  readonly rows: readonly TableRow[];
  readonly rowCount: number;
}

export interface TableState {
  readonly sort: TableSortState | null;
  readonly page: number;
  readonly pageCount: number;
  readonly search: string;
  readonly selectedRows: readonly number[];
  readonly filteredRowCount: number;
  readonly totalRowCount: number;
}

export interface Table {
  readonly config: ResolvedTableConfig;
  readonly data: TableData;
  readonly element: HTMLElement | null;
  readonly isDestroyed: boolean;
  render(target: string | Element): Table;
  update(config: TableConfig): Table;
  setData(data: DataInput, columns?: readonly (string | TableColumnConfig)[]): Table;
  setLoading(loading: boolean): Table;
  setError(message: string | null): Table;
  setSort(field: string | null, direction?: TableSortDirection, emit?: boolean): Table;
  setPage(page: number, emit?: boolean): Table;
  setSearch(query: string, emit?: boolean): Table;
  setSelection(indices: readonly number[], emit?: boolean): Table;
  getSelectedRows(): TableRow[];
  /** Export filtered, sorted rows as CSV. */
  toCSV(options?: TableCSVExportOptions): string;
  /** Export filtered, sorted rows as JSON. */
  toJSON(options?: TableJSONExportOptions): string;
  /** Export filtered, sorted rows as an HTML table. */
  toHTML(options?: TableHTMLExportOptions): string;
  getState(): TableState;
  destroy(): void;
}
