# @jitaspace/datatable-mantine

[`mantine-datatable`](https://icflorescu.github.io/mantine-datatable/)
implementation of the [`@jitaspace/datatable`](../datatable) contract.

```tsx
import type { DataTableColumn } from "@jitaspace/datatable";
import { DataTable } from "@jitaspace/datatable-mantine";
```

Sorting, global and column filtering, pagination, and column visibility are
managed in the wrapper, using the semantics, toolbar and filter inputs from
[`@jitaspace/datatable-common`](../datatable-common), so behaviour matches the
TanStack implementation. The `mantine-datatable` `DataTable` handles rendering,
including its own header filter button and popover (which, unlike TanStack's,
has no accessible name — a limitation of the library).

> **Note:** apps using this implementation must import the library stylesheet
> once at the app root:
>
> ```ts
> import "mantine-datatable/styles.css";
> ```

See [`@jitaspace/datatable`](../datatable) for the full API and column descriptor
reference.
