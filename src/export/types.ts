/** Options shared by chart export methods. */
export interface ChartExportOptions {
  /** Output width in pixels. Defaults to the rendered SVG width. */
  readonly width?: number;
  /** Output height in pixels. Defaults to the rendered SVG height. */
  readonly height?: number;
  /** Scale factor applied when explicit width and height are omitted. */
  readonly scale?: number;
  /** Background colour. Defaults to the chart theme background. */
  readonly background?: string;
}

/** Options for PNG chart export. */
export interface ChartPNGExportOptions extends ChartExportOptions {
  /** PNG encoder quality from 0 to 1. Defaults to 1. */
  readonly quality?: number;
}

/** Which table rows an export includes. */
export type TableExportScope = "all" | "page";

/** Options shared by table export methods. */
export interface TableExportOptions {
  /** Export every filtered row or only the current page. Defaults to `all`. */
  readonly scope?: TableExportScope;
  /** Include columns hidden by configuration. Defaults to false. */
  readonly includeHidden?: boolean;
}

/** Options for {@link Table.toCSV}. */
export interface TableCSVExportOptions extends TableExportOptions {
  /** Field delimiter. Defaults to a comma. */
  readonly delimiter?: string;
  /** Include the header row. Defaults to true. */
  readonly includeHeaders?: boolean;
  /** Prefix the output with a UTF-8 byte-order mark. Defaults to false. */
  readonly bom?: boolean;
  /** Line ending. Defaults to `\n`. */
  readonly lineEnding?: string;
}

/** Options for {@link Table.toJSON}. */
export interface TableJSONExportOptions extends TableExportOptions {
  /** `objects` returns records keyed by column; `matrix` returns arrays. */
  readonly format?: "objects" | "matrix";
  /** Use visible column labels instead of field names as object keys. */
  readonly useLabels?: boolean;
  /** Emit raw values instead of formatted display values. */
  readonly raw?: boolean;
  /** Include a header row in matrix output. Defaults to true. */
  readonly includeHeaders?: boolean;
  /** Pretty-print with two-space indentation. */
  readonly pretty?: boolean;
}

/** Options for {@link Table.toHTML}. */
export interface TableHTMLExportOptions extends TableExportOptions {
  /** Include the header row. Defaults to true. */
  readonly includeHeaders?: boolean;
  /** Include the table title as a caption. Defaults to false. */
  readonly includeTitle?: boolean;
}
