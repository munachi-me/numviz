import { NumvizError } from "../errors.js";

/** True for plain objects (not arrays or null). */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function requirePositiveNumber(value: unknown, path: string, fallback: number): number {
  if (value === undefined) return fallback;
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new NumvizError(`\`${path}\` must be a positive finite number.`, {
      code: "INVALID_CONFIG",
      path,
      details: { received: value }
    });
  }
  return value;
}

export function requireNonEmptyString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new NumvizError(`\`${path}\` must be a non-empty string.`, {
      code: "INVALID_CONFIG",
      path,
      details: { received: value }
    });
  }
  return value;
}

export function requireBoolean(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") {
    throw new NumvizError(`\`${path}\` must be a boolean.`, {
      code: "INVALID_CONFIG",
      path,
      details: { received: value }
    });
  }
  return value;
}

export function requireCallback(value: unknown, path: string): (...args: never[]) => unknown {
  if (typeof value !== "function") {
    throw new NumvizError(`\`${path}\` must be a function.`, {
      code: "INVALID_CONFIG",
      path,
      details: { received: typeof value }
    });
  }
  return value as (...args: never[]) => unknown;
}
