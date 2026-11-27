import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.ts"],
    globalSetup: ["./scripts/vitest-global-setup.mjs"],
    coverage: { enabled: false }
  }
});
