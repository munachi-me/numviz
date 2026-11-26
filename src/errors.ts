/** Machine-readable error codes raised by Numviz. */
export type NumvizErrorCode =
  | "INVALID_CONFIG"
  | "INVALID_TYPE"
  | "INVALID_DATA"
  | "INVALID_CONTAINER"
  | "CONTAINER_NOT_FOUND"
  | "NO_DOM"
  | "DESTROYED";

export interface NumvizErrorOptions {
  code: NumvizErrorCode;
  path?: string;
  details?: Record<string, unknown>;
  cause?: unknown;
}

/**
 * Error thrown for invalid configurations, data and lifecycle misuse.
 */
export class NumvizError extends Error {
  readonly code: NumvizErrorCode;
  readonly path?: string;
  readonly details?: Record<string, unknown>;

  constructor(message: string, options: NumvizErrorOptions) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "NumvizError";
    this.code = options.code;
    if (options.path !== undefined) this.path = options.path;
    if (options.details !== undefined) this.details = options.details;
  }
}

export function isNumvizError(value: unknown): value is NumvizError {
  return value instanceof NumvizError;
}

export function invalidConfig(message: string, path?: string, details?: Record<string, unknown>): NumvizError {
  return new NumvizError(message, { code: "INVALID_CONFIG", path, details });
}
