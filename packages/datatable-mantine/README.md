# @jitaspace/datatable-mantine

[`mantine-datatable`](https://icflorescu.github.io/mantine-datatable/)
implementation of the [`@jitaspace/datatable`](../datatable) contract.

```tsx
import { DataTable } from "@jitaspace/datatable-mantine";
import type { DataTableColumn } from "@jitaspace/datatable";
```

Sorting, global filtering, pagination, and column visibility are managed in the
wrapper so the toolbar and behaviour match the other implementations; the
`mantine-datatable` `DataTable` handles rendering.

> **Note:** apps using this implementation must import the library stylesheet
> once at the app root:
>
> ```ts
> import "mantine-datatable/styles.css";
> ```

See [`@jitaspace/datatable`](../datatable) for the full API and column descriptor
reference.
