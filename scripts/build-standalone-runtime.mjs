import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const sourceRoot = path.join(root, "src");
const outputDir = path.join(root, "dist", "standalone");
const outputFile = path.join(outputDir, "numviz-runtime.js");
const excludedDirectories = new Set([path.join(sourceRoot, "react")]);
const excludedFiles = new Set([path.join(sourceRoot, "dashboard", "export.ts")]);

async function collectFiles(directory) {
  const entries = await readdir(directory);
  const files = [];
  for (const entry of entries) {
    const full = path.join(directory, entry);
    const info = await stat(full);
    if (info.isDirectory()) {
      if (excludedDirectories.has(full)) continue;
      files.push(...(await collectFiles(full)));
    } else if (entry.endsWith(".ts") && !excludedFiles.has(full)) {
      files.push(full);
    }
  }
  return files;
}

function moduleId(file) {
  return path.relative(sourceRoot, file).split(path.sep).join("/");
}

const files = await collectFiles(sourceRoot);
const modules = new Map();

for (const file of files) {
  const source = await readFile(file, "utf8");
  const transpiled = ts.transpileModule(source, {
    fileName: file,
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
      isolatedModules: true,
      verbatimModuleSyntax: false
    }
  });
  modules.set(moduleId(file), transpiled.outputText);
}

const chunks = [];
for (const [id, code] of [...modules.entries()].sort(([left], [right]) => left.localeCompare(right))) {
  chunks.push(`  ${JSON.stringify(id)}: function (module, exports, require) {\n${code}\n  }`);
}

const bundle = `(function () {
  "use strict";
  var modules = {
${chunks.join(",\n")}
  };
  var cache = {};
  function resolve(from, request) {
    if (request.charAt(0) !== ".") {
      throw new Error('External module "' + request + '" is not available in the standalone runtime.');
    }
    var parts = from.split("/");
    parts.pop();
    var segments = request.split("/");
    for (var i = 0; i < segments.length; i += 1) {
      var segment = segments[i];
      if (segment === "." || segment === "") continue;
      if (segment === "..") parts.pop();
      else parts.push(segment);
    }
    var base = parts.join("/").replace(/\\.js$/, "");
    var candidates = [base + ".ts", base + "/index.ts"];
    for (var j = 0; j < candidates.length; j += 1) {
      if (modules[candidates[j]]) return candidates[j];
    }
    throw new Error('Unable to resolve "' + request + '" from "' + from + '".');
  }
  function load(id) {
    if (cache[id]) return cache[id].exports;
    if (!modules[id]) throw new Error('Unknown standalone module "' + id + '".');
    var module = { exports: {} };
    cache[id] = module;
    modules[id](module, module.exports, function (request) {
      return load(resolve(id, request));
    });
    return module.exports;
  }
  load("standalone/entry.ts");
})();
`;

await mkdir(outputDir, { recursive: true });
await writeFile(outputFile, bundle, "utf8");
console.log(`standalone runtime: ${path.relative(root, outputFile)} (${Buffer.byteLength(bundle)} bytes)`);
