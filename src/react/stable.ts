import { useRef } from "react";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Structural equality for plain configuration objects, arrays and dates. */
export function deepEqual(a: unknown, b: unknown, seen = new WeakMap<object, object>()): boolean {
  if (Object.is(a, b)) return true;
  if (!isObject(a) || !isObject(b)) return false;
  if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) return false;
  if (a instanceof Date || b instanceof Date) {
    return a instanceof Date && b instanceof Date && a.getTime() === b.getTime();
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((value, index) => deepEqual(value, b[index], seen));
  }
  const previous = seen.get(a);
  if (previous) return previous === b;
  seen.set(a, b);
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every(
    (key) => Object.prototype.hasOwnProperty.call(b, key) && deepEqual(a[key], b[key], seen)
  );
}

/**
 * Returns the previous value while a new configuration is structurally equal.
 * This keeps wrapper effects from rebuilding engines when a parent re-renders
 * with the same data.
 */
export function useStableValue<T>(value: T): T {
  const ref = useRef(value);
  if (!deepEqual(ref.current, value)) ref.current = value;
  return ref.current;
}
