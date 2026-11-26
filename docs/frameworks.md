# React and Next.js

Numviz is framework-independent. The core package (`@munachi-me/numviz`) has no
runtime dependencies and never imports React. React support is an optional
subpath: `@munachi-me/numviz/react`.

## Install

```bash
npm install @munachi-me/numviz react
```

`react` (>=18) is an optional peer dependency. Importing the core entry never
loads React and never requires it to be installed.

## DataTable

```tsx
import { DataTable } from "@munachi-me/numviz/react";

const employees = [
  { name: "Ada", department: "Engineering", salary: 145000, active: true },
  { name: "Grace", department: "Engineering", salary: 152000, active: true }
];

export function Employees() {
  return (
    <DataTable
      data={employees}
      title="Employees"
      searchable
      pagination
      pageSize={10}
      selectable
      variant="dashboard"
      columns={[
        { field: "name", label: "Employee" },
        { field: "department", label: "Department" },
        { field: "salary", label: "Salary", format: "currency", currency: "USD" },
        { label: "Status", render: (row) => (row.active ? "Active" : "Inactive") }
      ]}
    />
  );
}
```

`DataTable` accepts every `TableConfig` option except that `loading`, `error`,
`style` and the controlled props are typed separately. The component renders a
host `<div data-numviz-react="table">` and creates the table engine inside an
effect, so the table markup is managed outside React's reconciliation.

## Controlled state

Omit controlled props for uncontrolled behaviour. Provide them for controlled
state, and update them from the callbacks:

```tsx
import { useState } from "react";
import { DataTable } from "@munachi-me/numviz/react";
import type { TableSortState } from "@munachi-me/numviz";

export function ControlledTable({ rows }: { rows: Record<string, unknown>[] }) {
  const [sort, setSort] = useState<TableSortState | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<readonly number[]>([]);

  return (
    <DataTable
      data={rows}
      sortable
      searchable
      pagination
      pageSize={10}
      selectable
      sort={sort}
      page={page}
      search={search}
      selectedRows={selected}
      onSortChange={setSort}
      onPageChange={setPage}
      onSearchChange={(query) => {
        setSearch(query);
        setPage(1);
      }}
      onSelectionChange={(indices) => setSelected(indices)}
    />
  );
}
```

`loading` and `error` props map to `setLoading` and `setError`:

```tsx
<DataTable data={rows} loading={isLoading} error={errorMessage} />
```

## Imperative handle

Use a ref to reach the underlying engine for actions not exposed by props:

```tsx
import { useRef } from "react";
import { DataTable, type DataTableHandle } from "@munachi-me/numviz/react";

const ref = useRef<DataTableHandle>(null);
// ...
<DataTable ref={ref} data={rows} />;
// ref.current?.getTable()?.setSort("salary", "desc");
```

## Next.js

The React entry starts with `"use client"`, so it can be imported from a client
component directly. The table is created in `useEffect`, which means importing
the component is safe during server rendering: the server output is the host
element only.

### App Router

```tsx
"use client";

import { DataTable } from "@munachi-me/numviz/react";

export default function Page() {
  return <DataTable data={rows} searchable pagination />;
}
```

Rules of thumb:

- Keep data fetching on the server and pass plain, serializable records to the
  client component.
- Do not call `createTable` or read `window`/`document` during render or at
  module scope; the component already defers DOM work to an effect.
- `render` callbacks receive row objects on the client. Define them in the
  client component, not in a server-only module.
- If your page is fully server-rendered and you prefer no client bundle, use the
  vanilla engine with a small client component that calls `createTable`.

### Pages Router and dynamic import

If a bundler or configuration cannot process the subpath, load it without SSR:

```tsx
import dynamic from "next/dynamic";

const DataTable = dynamic(
  () => import("@munachi-me/numviz/react").then((mod) => mod.DataTable),
  { ssr: false }
);
```

### Server-side rendering notes

- `DataTable` renders only its host element on the server; no `document` or
  `window` access happens during render.
- Sorting, searching, pagination and selection work after hydration.
- Pagination renders one page at a time, which keeps large datasets out of the
  DOM in both server and client environments.
- The vanilla `createTable` engine can be tested in jsdom without React.

## Styling parity

The same `theme`, `variant`, `striped`, `className` and token options apply to
vanilla and React tables, because both use one engine and one stylesheet. Theme
custom properties are set on the table root, so overrides do not leak into other
components.
