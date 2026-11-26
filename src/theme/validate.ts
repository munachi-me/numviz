import { NumvizError } from "../errors.js";
import { isPlainObject, requireNonEmptyString } from "../utils/validate.js";
import type { ThemeConfig, ThemeMode } from "../types.js";

const THEME_MODES: readonly ThemeMode[] = ["light", "dark", "system"];
const THEME_STRING_TOKENS = [
  "accent",
  "fontFamily",
  "background",
  "surface",
  "text",
  "mutedText",
  "border",
  "grid"
] as const;

/** Validate and copy a partial theme configuration. */
export function resolveThemeConfig(input: ThemeConfig | undefined): ThemeConfig {
  if (input === undefined) return {};
  if (!isPlainObject(input)) {
    throw new NumvizError("`theme` must be an object.", { code: "INVALID_CONFIG", path: "theme" });
  }
  const theme = input as ThemeConfig;
  if (theme.mode !== undefined && !THEME_MODES.includes(theme.mode)) {
    throw new NumvizError(`\`theme.mode\` must be one of: ${THEME_MODES.join(", ")}.`, {
      code: "INVALID_CONFIG",
      path: "theme.mode",
      details: { received: theme.mode }
    });
  }
  if (
    theme.borderRadius !== undefined &&
    (typeof theme.borderRadius !== "number" ||
      !Number.isFinite(theme.borderRadius) ||
      theme.borderRadius < 0)
  ) {
    throw new NumvizError("`theme.borderRadius` must be a non-negative finite number.", {
      code: "INVALID_CONFIG",
      path: "theme.borderRadius",
      details: { received: theme.borderRadius }
    });
  }
  for (const field of THEME_STRING_TOKENS) {
    const value = theme[field];
    if (value !== undefined) requireNonEmptyString(value, `theme.${field}`);
  }
  if (theme.chartPalette !== undefined) {
    if (!Array.isArray(theme.chartPalette) || theme.chartPalette.length === 0) {
      throw new NumvizError("`theme.chartPalette` must be a non-empty array of colours.", {
        code: "INVALID_CONFIG",
        path: "theme.chartPalette"
      });
    }
    theme.chartPalette.forEach((color, index) => {
      requireNonEmptyString(color, `theme.chartPalette[${index}]`);
    });
  }
  return { ...theme };
}
