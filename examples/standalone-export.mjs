import { createDashboard } from "@munachi-me/numviz";

const dashboard = createDashboard({
  title: "Sales Analytics",
  description: "Generated as a static dashboard",
  components: [
    {
      id: "revenue",
      type: "metric",
      name: "Total Revenue",
      data: [
        { month: "Jan", revenue: 32000 },
        { month: "Feb", revenue: 41000 },
        { month: "Mar", revenue: 38500 }
      ],
      column: "revenue",
      aggregation: "sum",
      format: "currency"
    },
    {
      id: "sales",
      type: "chart",
      chartType: "line",
      data: [
        { month: "Jan", revenue: 32000 },
        { month: "Feb", revenue: 41000 },
        { month: "Mar", revenue: 38500 }
      ],
      x: "month",
      y: "revenue"
    },
    {
      id: "records",
      type: "table",
      data: [
        { month: "Jan", revenue: 32000 },
        { month: "Feb", revenue: 41000 },
        { month: "Mar", revenue: 38500 }
      ],
      searchable: true,
      sortable: true
    }
  ]
});

const result = await dashboard.export({
  format: "html",
  output: "./dashboard",
  data: "embedded"
});

console.log(`Wrote ${result.files.length} files to ${result.output}`);
