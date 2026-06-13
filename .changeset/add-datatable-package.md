---
"@jitaspace/datatable": minor
"@jitaspace/datatable-tanstack": minor
"@jitaspace/datatable-mantine": minor
"@jitaspace/web": patch
---

Add a DataTable abstraction split across three packages:

- **`@jitaspace/datatable`** — an engine-agnostic contract (types only): a neutral `DataTableColumn`/`DataTableProps` API that implementations satisfy, so the rendering engine can be swapped without touching consumers.
- **`@jitaspace/datatable-tanstack`** — implementation backed by TanStack Table, styled with Mantine.
- **`@jitaspace/datatable-mantine`** — implementation backed by the `mantine-datatable` library.

Both implementations support sorting, global filtering, pagination, column visibility, loading/empty states, and row clicks with identical behaviour. The LP Store table uses the TanStack implementation.
