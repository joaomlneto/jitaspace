# @jitaspace/datatable

The **engine-agnostic DataTable contract** for JitaSpace. This package contains
**only types** — no runtime code, no rendering engine, no Mantine dependency.

It defines the column descriptor and component props that every concrete
implementation must satisfy, so the app can depend on a stable API and swap the
table engine freely.

## Implementations

| Package | Engine | Notes |
| --- | --- | --- |
| [`@jitaspace/datatable-tanstack`](../datatable-tanstack) | [TanStack Table](https://tanstack.com/table) | Headless engine, styled with Mantine primitives. Fully in-house. |
| [`@jitaspace/datatable-mantine`](../datatable-mantine) | [`mantine-datatable`](https://icflorescu.github.io/mantine-datatable/) | Batteries-included third-party component. |

Both export a `DataTable` component assignable to `DataTableComponent` and behave
identically for the shared feature set (sorting, global filter, pagination,
column visibility, loading/empty states, row clicks).

## Usage

```tsx
import type { DataTableColumn } from "@jitaspace/datatable";
// pick an implementation:
import { DataTable } from "@jitaspace/datatable-tanstack";
// import { DataTable } from "@jitaspace/datatable-mantine";

interface Person {
  id: number;
  name: string;
  age: number;
}

const columns: DataTableColumn<Person>[] = [
  { id: "name", header: "Name", accessor: "name", sortable: true },
  { id: "age", header: "Age", accessor: "age", sortable: true, align: "right" },
];

<DataTable
  data={people}
  columns={columns}
  rowId={(p) => p.id}
  withGlobalFilter
  withColumnVisibility
  withPagination
  defaultPageSize={25}
  initialSort={{ columnId: "name", direction: "asc" }}
  striped
  highlightOnHover
  withTableBorder
/>;
```

To hold either implementation in a typed variable:

```ts
import type { DataTableComponent } from "@jitaspace/datatable";
const Table: DataTableComponent = DataTable;
```

## Column descriptor (`DataTableColumn`)

| Field | Purpose |
| --- | --- |
| `id` | Stable unique id (sort/visibility key). **Required.** |
| `header` | Header text and column-visibility-menu label. **Required.** |
| `accessor` | `keyof TData` or `(row) => value` — drives default rendering, global-filter matching, and sorting. Omit for display-only columns. |
| `cell` | `(row, value) => ReactNode` custom renderer. |
| `sortable` | Enable click-to-sort. Default `false`. |
| `sortAccessor` | Custom sort key (e.g. sort an entity column by name). |
| `enableHiding` | Allow hiding via the visibility menu. Default `true`. |
| `defaultVisible` | Initial visibility. Default `true`. |
| `align` | `"left" \| "center" \| "right"`. |
| `width` | Fixed width in px. |
