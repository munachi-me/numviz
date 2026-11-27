import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runtime = path.join(root, "dist", "standalone", "numviz-runtime.js");

export default function setup() {
  if (existsSync(runtime)) return;
  execFileSync(process.execPath, [path.join(root, "scripts", "build-standalone-runtime.mjs")], {
    cwd: root,
    stdio: "inherit"
  });
}
