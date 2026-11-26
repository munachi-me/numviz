import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_PALETTE, paletteColor, resolveTheme, resolveThemeMode } from "../src/theme/tokens.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("resolveTheme", () => {
  it("returns the balanced light default", () => {
    const tokens = resolveTheme();
    expect(tokens.mode).toBe("light");
    expect(tokens.accent).toBe("#6366F1");
    expect(tokens.chartPalette).toEqual(DEFAULT_PALETTE);
  });

  it("returns dark tokens and applies overrides", () => {
    const tokens = resolveTheme({ mode: "dark", accent: "#ff0000", borderRadius: 6 });
    expect(tokens.mode).toBe("dark");
    expect(tokens.accent).toBe("#ff0000");
    expect(tokens.borderRadius).toBe(6);
    expect(tokens.background).toBe("#0B1120");
  });

  it("resolves system mode from the media query", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    expect(resolveThemeMode("system")).toBe("dark");
  });

  it("falls back to light when matchMedia is unavailable or throws", () => {
    vi.stubGlobal("matchMedia", () => {
      throw new Error("no media queries");
    });
    expect(resolveThemeMode("system")).toBe("light");
  });

  it("cycles palette colours", () => {
    expect(paletteColor(["a", "b"], 0)).toBe("a");
    expect(paletteColor(["a", "b"], 3)).toBe("b");
    expect(paletteColor([], 2)).toBe(DEFAULT_PALETTE[0]);
  });
});
