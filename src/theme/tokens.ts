import type { ThemeConfig, ThemeTokens } from "../types.js";

export const DEFAULT_PALETTE: readonly string[] = [
  "#6366F1",
  "#06B6D4",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#14B8A6",
  "#F97316",
  "#3B82F6",
  "#EC4899"
];

const LIGHT_BASE = {
  background: "#FFFFFF",
  surface: "#F8FAFC",
  surfaceElevated: "#FFFFFF",
  text: "#0F172A",
  mutedText: "#64748B",
  border: "#CBD5E1",
  grid: "#E2E8F0",
  accent: "#6366F1",
  positive: "#059669",
  warning: "#D97706",
  danger: "#DC2626",
  info: "#0284C7"
} as const;

const DARK_BASE = {
  background: "#0B1120",
  surface: "#111827",
  surfaceElevated: "#1E293B",
  text: "#F1F5F9",
  mutedText: "#94A3B8",
  border: "#334155",
  grid: "#1E293B",
  accent: "#818CF8",
  positive: "#34D399",
  warning: "#FBBF24",
  danger: "#F87171",
  info: "#38BDF8"
} as const;

export const DEFAULT_FONT_FAMILY =
  'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

type MediaQueryWindow = {
  matchMedia?: (query: string) => { matches: boolean };
};

function prefersDarkMode(view?: MediaQueryWindow | null): boolean {
  const media = view?.matchMedia ?? globalThis.matchMedia;
  if (typeof media !== "function") return false;
  try {
    return media("(prefers-color-scheme: dark)").matches;
  } catch {
    return false;
  }
}

export function resolveThemeMode(
  mode: ThemeConfig["mode"] = "light",
  view?: MediaQueryWindow | null
): "light" | "dark" {
  return mode === "system" ? (prefersDarkMode(view) ? "dark" : "light") : mode;
}

/**
 * Resolve a partial theme configuration into complete design tokens.
 * Component values take precedence over library defaults.
 */
export function resolveTheme(theme: ThemeConfig = {}, view?: MediaQueryWindow | null): ThemeTokens {
  const mode = resolveThemeMode(theme.mode, view);
  const base = mode === "dark" ? DARK_BASE : LIGHT_BASE;
  const colors = theme.colors;
  return {
    mode,
    background: theme.background ?? colors?.background ?? base.background,
    surface: theme.surface ?? colors?.surface ?? base.surface,
    surfaceElevated: theme.surfaceElevated ?? colors?.surfaceElevated ?? base.surfaceElevated,
    text: theme.text ?? colors?.text ?? base.text,
    mutedText: theme.mutedText ?? colors?.mutedText ?? base.mutedText,
    border: theme.border ?? colors?.border ?? base.border,
    grid: theme.grid ?? colors?.grid ?? base.grid,
    accent: theme.accent ?? colors?.primary ?? base.accent,
    positive: theme.positive ?? colors?.positive ?? base.positive,
    warning: theme.warning ?? colors?.warning ?? base.warning,
    danger: theme.danger ?? colors?.danger ?? base.danger,
    info: theme.info ?? colors?.info ?? base.info,
    fontFamily: theme.fontFamily ?? DEFAULT_FONT_FAMILY,
    borderRadius: theme.borderRadius ?? 12,
    chartPalette:
      theme.chartPalette && theme.chartPalette.length > 0 ? [...theme.chartPalette] : DEFAULT_PALETTE
  };
}

/** Pick a palette colour by index, cycling when the palette is shorter than the data. */
export function paletteColor(palette: readonly string[], index: number): string {
  if (palette.length === 0) return DEFAULT_PALETTE[0] as string;
  return palette[((index % palette.length) + palette.length) % palette.length] as string;
}
