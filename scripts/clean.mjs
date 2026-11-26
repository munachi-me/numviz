#!/usr/bin/env node
import { rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Remove build output without shell-specific commands so the build works on
 * Windows, macOS and Linux alike.
 */
export function clean(targets = ["dist"]) {
  for (const target of targets) {
    rmSync(target, { recursive: true, force: true });
  }
}

const entry = process.argv[1] ? path.resolve(process.argv[1]) : "";
const isDirectRun = entry === fileURLToPath(import.meta.url);

if (isDirectRun) {
  const targets = process.argv.slice(2);
  clean(targets.length > 0 ? targets : ["dist"]);
}
