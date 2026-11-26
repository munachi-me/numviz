import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (file: string): string => readFileSync(path.join(root, file), "utf8");
const pkg = JSON.parse(read("package.json")) as {
  name: string;
  version: string;
  license: string;
  type: string;
  main: string;
  module: string;
  types: string;
  exports: Record<string, { types?: string; import?: string; default?: string } | string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  peerDependenciesMeta?: Record<string, { optional?: boolean }>;
  repository?: { type: string; url: string };
  homepage?: string;
  bugs?: { url: string };
  publishConfig?: { access?: string };
};
const lock = JSON.parse(read("package-lock.json")) as {
  name: string;
  version: string;
  packages: Record<
    string,
    {
      name?: string;
      version?: string;
      license?: string;
      devDependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
      peerDependenciesMeta?: Record<string, { optional?: boolean }>;
    }
  >;
};
const readme = read("README.md");
const changelog = read("CHANGELOG.md");
const api = read("docs/api.md");
const sourceVersion = /VERSION = "([^"]+)"/.exec(read("src/version.ts"))?.[1];

function filesUnder(directory: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(directory)) {
    const full = path.join(directory, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) results.push(...filesUnder(full));
    else results.push(full);
  }
  return results;
}

const scannedExtensions = new Set([".md", ".ts", ".mjs", ".html", ".yml", ".yaml", ".json"]);
const scannedFiles = [
  "README.md",
  "CHANGELOG.md",
  "package.json",
  ...filesUnder(path.join(root, "docs")),
  ...filesUnder(path.join(root, "examples")),
  ...filesUnder(path.join(root, "scripts")),
  ...filesUnder(path.join(root, ".github")),
  ...filesUnder(path.join(root, "src"))
].filter((file) => scannedExtensions.has(path.extname(file)));

const forbiddenPatterns: Array<[string, RegExp]> = [
  ["unscoped package import", /(?:from|require\()\s*["']numviz(?:\/[^"']*)?["']/],
  ["unscoped React subpath", /["']numviz\/react["']/],
  ["unscoped npm install", /npm\s+(?:install|i|add)\s+numviz(?:\s|$)/m],
  ["wrong owner scope", /@munachi(?!-me)\//],
  ["wrong namespace prefix", /@munachi-me\/numviz-/]
];

describe("package identity and version consistency", () => {
  it("uses the official package identity everywhere", () => {
    expect(pkg.name).toBe("@munachi-me/numviz");
    expect(lock.name).toBe("@munachi-me/numviz");
    expect(lock.packages[""]?.name).toBe("@munachi-me/numviz");
    expect(readme).toContain("npm install @munachi-me/numviz");
  });

  it("agrees on the current version across manifests and docs", () => {
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(lock.version).toBe(pkg.version);
    expect(lock.packages[""]?.version).toBe(pkg.version);
    expect(sourceVersion).toBe(pkg.version);
    expect(readme).toContain(`**Current release:** \`${pkg.version}\``);
    expect(readme).not.toContain("**Current release:** `0.3.0`");
    expect(api.startsWith(`# Numviz API reference — ${pkg.version}`)).toBe(true);
    expect(changelog).toContain(`## [${pkg.version}]`);
  });

  it("keeps lockfile root metadata in sync with package.json", () => {
    const lockRoot = lock.packages[""] ?? {};
    expect(lockRoot.license).toBe(pkg.license);
    expect(lockRoot.devDependencies ?? {}).toEqual(pkg.devDependencies ?? {});
    expect(lockRoot.peerDependencies ?? {}).toEqual(pkg.peerDependencies ?? {});
    expect(lockRoot.peerDependenciesMeta ?? {}).toEqual(pkg.peerDependenciesMeta ?? {});
  });

  it("publishes the core and optional React entry points", () => {
    const core = pkg.exports["."];
    const react = pkg.exports["./react"];
    expect(typeof core).toBe("object");
    expect(typeof react).toBe("object");
    if (typeof core !== "object" || typeof react !== "object") return;
    expect(core.types).toBe("./dist/index.d.ts");
    expect(core.import).toBe("./dist/index.js");
    expect(react.types).toBe("./dist/react/index.d.ts");
    expect(react.import).toBe("./dist/react/index.js");
    expect(pkg.main).toBe("./dist/index.js");
    expect(pkg.module).toBe("./dist/index.js");
    expect(pkg.types).toBe("./dist/index.d.ts");
    expect(pkg.type).toBe("module");
    expect(pkg.peerDependencies?.react).toBeDefined();
    expect(pkg.peerDependenciesMeta?.react?.optional).toBe(true);
    expect(pkg.repository?.url).toBe("git+https://github.com/munachi-me/numviz.git");
    expect(pkg.homepage).toBe("https://github.com/munachi-me/numviz#readme");
    expect(pkg.bugs?.url).toBe("https://github.com/munachi-me/numviz/issues");
    expect(pkg.publishConfig?.access).toBe("public");
  });

  it("contains no outdated or unscoped package references", () => {
    const violations: string[] = [];
    for (const file of scannedFiles) {
      const text = readFileSync(file, "utf8");
      for (const [label, pattern] of forbiddenPatterns) {
        if (pattern.test(text)) violations.push(`${path.relative(root, file)}: ${label}`);
      }
    }
    expect(violations).toEqual([]);
  });

  it("keeps CI on npm ci and the full verify script", () => {
    const workflow = read(".github/workflows/ci.yml");
    expect(workflow).toContain("npm ci");
    expect(workflow).toContain("npm run verify");
    expect(workflow).toContain("node: [20, 22]");
  });
});
