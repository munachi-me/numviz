import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createDashboard } from "../src/index.js";

const directories: string[] = [];

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), "numviz-print-"));
  directories.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("standalone reporting", () => {
  it("includes print rules and escapes untrusted data in generated scripts", async () => {
    const directory = await temporaryDirectory();
    const output = path.join(directory, "report.html");
    const unsafe = '</script><script>alert("x")</script><img src=x onerror=alert(1)>';
    await createDashboard({
      title: "Report",
      components: [
        {
          id: "records",
          type: "table",
          data: [{ name: unsafe, amount: 10 }],
          columns: [
            { field: "name", label: "Name" },
            { field: "amount", label: "Amount" }
          ]
        }
      ]
    }).export({ output });

    const html = await readFile(output, "utf8");
    expect(html).toContain("@media print");
    expect(html).toContain("@page { margin: 12mm; }");
    expect(html).not.toContain(unsafe);
    expect(html).toContain("\\u003c/script");
  });

  it("writes print rules to directory exports", async () => {
    const directory = path.join(await temporaryDirectory(), "dashboard");
    await createDashboard({
      title: "Report",
      components: [{ id: "note", type: "text", text: "Printable" }]
    }).export({ output: directory });
    const css = await readFile(path.join(directory, "assets", "styles.css"), "utf8");
    expect(css).toContain("@media print");
    expect(css).toContain(".numviz-dashboard__filters");
  });
});
