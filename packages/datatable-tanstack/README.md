# @jitaspace/datatable-tanstack

[TanStack Table](https://tanstack.com/table) implementation of the
[`@jitaspace/datatable`](../datatable) contract, styled with Mantine primitives
(`Table`, `Popover`, `Pagination`, …).

```tsx
import type { DataTableColumn } from "@jitaspace/datatable";
import { DataTable } from "@jitaspace/datatable-tanstack";
```

See [`@jitaspace/datatable`](../datatable) for the full API and column descriptor
reference. This implementation is fully in-house (no third-party table
component), giving complete control over markup and styling.

TanStack runs the row pipeline (filter → sort → paginate) and owns the table
state; what a sort key, filter or search _means_ comes from
[`@jitaspace/datatable-common`](../datatable-common), as do the toolbar and the
filter inputs. TanStack's own notion of a column's value is its sort key, which
lets `sortUndefined: "last"` keep missing values at the bottom in both
directions; rendering and filtering read the raw value instead.
