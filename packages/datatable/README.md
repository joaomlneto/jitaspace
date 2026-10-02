# @jitaspace/datatable

The **engine-agnostic DataTable contract** for JitaSpace. This package contains
**only types** — no runtime code, no rendering engine, no Mantine dependency.

It defines the column descriptor and component props that every concrete
implementation must satisfy, so the app can depend on a stable API and swap the
table engine freely.

## Implementations

| Package                                                  | Engine                                                                 | Notes                                                            |
| -------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------- |
| [`@jitaspace/datatable-tanstack`](../datatable-tanstack) | [TanStack Table](https://tanstack.com/table)                           | Headless engine, styled with Mantine primitives. Fully in-house. |
| [`@jitaspace/datatable-mantine`](../datatable-mantine)   | [`mantine-datatable`](https://icflorescu.github.io/mantine-datatable/) | Batteries-included third-party component.                        |

Both export a `DataTable` component assignable to `DataTableComponent` and behave
identically for the shared feature set (sorting, global filter, column filters,
pagination, column visibility, loading/empty states, row clicks). They get there
by sharing code, not by convention: how a value sorts, what a filter or search
matches, the toolbar and the filter inputs all live in
[`@jitaspace/datatable-common`](../datatable-common). In the web app, render
`~/components/DataTable`, which picks the engine from the user's settings.

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

| Field            | Purpose                                                                                                                           |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `id`             | Stable unique id (sort/visibility key). **Required.**                                                                             |
| `header`         | Header text and column-visibility-menu label. **Required.**                                                                       |
| `accessor`       | `keyof TData` or `(row) => value` — drives default rendering, global-filter matching, and sorting. Omit for display-only columns. |
| `cell`           | `(row, value) => ReactNode` custom renderer.                                                                                      |
| `sortable`       | Enable click-to-sort. Default `false`.                                                                                            |
| `sortAccessor`   | Custom sort key (e.g. sort an entity column by name).                                                                             |
| `enableHiding`   | Allow hiding via the visibility menu. Default `true`.                                                                             |
| `defaultVisible` | Initial visibility. Default `true`.                                                                                               |
| `align`          | `"left" \| "center" \| "right"`.                                                                                                  |
| `width`          | Fixed width in px.                                                                                                                |
| `filter`         | A filter control in the column header — see below.                                                                                |
| `filterAccessor` | The value the filter tests, when it should differ from the accessor value.                                                        |

## Column filters

Set `filter` on a column to put a filter button in its header. Every type tests
the column's filter value (`filterAccessor`, else the `accessor` value):

| `filter`                               | Matches                                                                                        |
| -------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `{ type: "text" }`                     | Case-insensitive substring.                                                                    |
| `{ type: "select", options? }`         | Exactly one chosen value.                                                                      |
| `{ type: "multi-select", options? }`   | Exactly any of the chosen values — never a substring ("Brokers Fee" ≠ "Contract Brokers Fee"). |
| `{ type: "range", min?, max?, step? }` | An inclusive numeric range; either end may be open. Non-numbers drop out while it is set.      |
| `{ type: "boolean" }`                  | Yes / No, by truthiness.                                                                       |
| `{ type: "date-range" }`               | Whole local days, inclusive; the value may be a `Date`, ISO string or timestamp.               |

Without `options`, the select types offer every distinct value in the data, in
natural order; an array value matches when any element does. Active filters
combine with each other and with the global search, and the toolbar shows a
"Clear filters" button while any is set.

## Sorting and loading

- Rows whose sort value is `null` or `undefined` sort **last in either
  direction**. Dates sort chronologically, booleans as 0/1, strings naturally
  ("Item 9" before "Item 10").
- `isLoading` renders a full page of skeleton rows (the page size, or 10 without
  pagination) in place of the data, so the table is already at its loaded height
  and the rows arriving do not shift the page.
