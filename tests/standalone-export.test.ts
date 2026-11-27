import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { JSDOM } from "jsdom";
import { afterEach, describe, expect, it } from "vitest";
import { createDashboard, NumvizError, type DashboardConfig } from "../src/index.js";

const directories: string[] = [];

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), "numviz-export-"));
  directories.push(directory);
  return directory;
}

function config(): DashboardConfig {
  return {
    title: "Sales Analytics",
    description: "Business performance overview",
    components: [
      {
        id: "revenue",
        type: "metric",
        name: "Total Revenue",
        data: [
          { region: "North", revenue: 120 },
          { region: "South", revenue: 80 }
        ],
        column: "revenue",
        aggregation: "sum",
        format: "currency"
      },
      {
        id: "sales",
        type: "chart",
        chartType: "bar",
        title: "Revenue by region",
        data: [
          { region: "North", revenue: 120 },
          { region: "South", revenue: 80 }
        ],
        x: "region",
        y: "revenue"
      },
      {
        id: "records",
        type: "table",
        data: [
          { region: "North", revenue: 120 },
          { region: "South", revenue: 80 }
        ],
        searchable: true,
        sortable: true
      }
    ]
  };
}

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("standalone dashboard export", () => {
  it("writes a self-contained directory with embedded data", async () => {
    const directory = path.join(await temporaryDirectory(), "dashboard");
    const result = await createDashboard(config()).export({ output: directory });

    expect(result.singleFile).toBe(false);
    expect(result.data).toBe("embedded");
    expect(result.output).toBe(path.resolve(directory));
    expect(result.files.map((file) => file.path)).toEqual([
      "index.html",
      "assets/styles.css",
      "assets/dashboard.js",
      "assets/numviz/runtime.js",
      "README.md"
    ]);
    expect((await stat(path.join(directory, "assets", "numviz", "runtime.js"))).isFile()).toBe(true);

    const html = await readFile(path.join(directory, "index.html"), "utf8");
    expect(html).toContain('<link rel="stylesheet" href="./assets/styles.css" />');
    expect(html).toContain('<script src="./assets/numviz/runtime.js"></script>');
    expect(html).toContain('<script src="./assets/dashboard.js"></script>');
    expect(html).not.toContain("data/data.json");

    const bootstrap = await readFile(path.join(directory, "assets", "dashboard.js"), "utf8");
    expect(bootstrap).toContain('"id":"revenue"');
    expect(bootstrap).toContain('"data":[{"region":"North"');
    expect(bootstrap).not.toContain("fetch(");
  });

  it("writes external component data without embedding it in the page", async () => {
    const directory = path.join(await temporaryDirectory(), "dashboard");
    const result = await createDashboard(config()).export({ output: directory, data: "external" });

    expect(result.data).toBe("external");
    expect(result.files.map((file) => file.path)).toContain("data/data.json");

    const bootstrap = await readFile(path.join(directory, "assets", "dashboard.js"), "utf8");
    expect(bootstrap).toContain("fetch(\"./data/data.json\"");
    expect(bootstrap).not.toContain('"region":"North"');

    const payload = JSON.parse(await readFile(path.join(directory, "data", "data.json"), "utf8")) as {
      version: number;
      components: Record<string, unknown>;
    };
    expect(payload.version).toBe(1);
    expect(payload.components.revenue).toEqual([
      { region: "North", revenue: 120 },
      { region: "South", revenue: 80 }
    ]);
    expect(payload.components.sales).toBeDefined();
    expect(payload.components.records).toBeDefined();
  });

  it("writes a single-file dashboard and runs without an installed Numviz package", async () => {
    const directory = await temporaryDirectory();
    const output = path.join(directory, "dashboard.html");
    const result = await createDashboard(config()).export({
      output,
      title: "Acme Sales",
      description: "Quarterly overview",
      logo: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'/>"
    });

    expect(result.singleFile).toBe(true);
    expect(result.files).toHaveLength(1);
    const html = await readFile(output, "utf8");
    expect(html).toContain("<style>");
    expect(html).toContain("NumvizStandalone");
    expect(html).toContain("Acme Sales");
    expect(html).not.toContain("assets/dashboard.js");

    const dom = new JSDOM(html, {
      runScripts: "dangerously",
      pretendToBeVisual: true,
      url: "http://localhost/dashboard.html"
    });
    await new Promise((resolve) => setTimeout(resolve, 50));
    const document = dom.window.document;
    expect(document.querySelector(".numviz-dashboard")).not.toBeNull();
    expect(document.querySelector(".numviz-dashboard__title")?.textContent).toBe("Acme Sales");
    expect(document.querySelector(".numviz-dashboard__description")?.textContent).toBe("Quarterly overview");
    expect(document.querySelector(".numviz-dashboard__logo")?.getAttribute("src")).toContain("data:image/svg+xml");
    expect(document.querySelectorAll(".numviz-dashboard__widget")).toHaveLength(3);
    expect(document.querySelector(".numviz-metric__value")?.textContent).toBe("$200.00");
    expect(document.querySelectorAll('[data-numviz-part="bar"]')).toHaveLength(2);
    expect(document.querySelector("table")).not.toBeNull();
    dom.window.close();
  });

  it("applies branding, layout and theme overrides", async () => {
    const directory = await temporaryDirectory();
    const output = path.join(directory, "branded.html");
    await createDashboard(config()).export({
      output,
      background: "#101828",
      fontFamily: "Georgia, serif",
      theme: { mode: "dark", colors: { primary: "#F59E0B" } },
      layout: { columns: 2, align: "center" },
      footer: { text: "Generated by Numviz" }
    });

    const html = await readFile(output, "utf8");
    expect(html).toContain("background: #101828");
    expect(html).toContain("font-family: Georgia, serif");
    expect(html).toContain('"align":"center"');
    expect(html).toContain('"mode":"dark"');
    expect(html).toContain('"accent":"#F59E0B"');
    expect(html).toContain("Generated by Numviz");
  });


  it("preserves filters and interactive controls in a standalone dashboard", async () => {
    const directory = await temporaryDirectory();
    const output = path.join(directory, "filtered.html");
    const filtered = config();
    const exported: DashboardConfig = {
      ...filtered,
      filters: [
        {
          id: "region",
          type: "select",
          field: "region",
          label: "Region"
        }
      ]
    };
    await createDashboard(exported).export({ output });

    const html = await readFile(output, "utf8");
    expect(html).toContain('"filters":[{"id":"region"');
    const dom = new JSDOM(html, {
      runScripts: "dangerously",
      pretendToBeVisual: true,
      url: "http://localhost/filtered.html"
    });
    await new Promise((resolve) => setTimeout(resolve, 50));
    const document = dom.window.document;
    const select = document.querySelector<HTMLSelectElement>(
      '[data-nv-filter-id="region"] select'
    );
    expect(select).not.toBeNull();
    select!.value = "North";
    select!.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    expect(document.querySelector(".numviz-metric__value")?.textContent).toBe("$120.00");
    dom.window.close();
  });

  it("rejects custom components and invalid single-file data modes", async () => {
    const directory = await temporaryDirectory();
    const dashboard = createDashboard({
      components: [
        {
          id: "custom",
          type: "custom",
          render: () => "Hello"
        }
      ]
    });

    await expect(dashboard.export({ output: path.join(directory, "custom") })).rejects.toMatchObject({
      code: "INVALID_CONFIG"
    });

    const customFilter = createDashboard({
      ...config(),
      filters: [
        {
          id: "custom",
          type: "custom",
          label: "Custom",
          render: () => "Custom"
        }
      ]
    });
    await expect(
      customFilter.export({ output: path.join(directory, "custom-filter") })
    ).rejects.toMatchObject({ code: "INVALID_CONFIG" });

    await expect(
      createDashboard(config()).export({ output: path.join(directory, "dashboard.html"), data: "external" })
    ).rejects.toBeInstanceOf(NumvizError);

    await expect(createDashboard(config()).export({ output: directory, format: "pdf" as never })).rejects.toMatchObject({
      code: "INVALID_CONFIG"
    });

    const destroyed = createDashboard(config());
    destroyed.destroy();
    await expect(destroyed.export({ output: path.join(directory, "destroyed") })).rejects.toMatchObject({
      code: "DESTROYED"
    });
  });
});
