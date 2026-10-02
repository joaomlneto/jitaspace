---
"@jitaspace/datatable": minor
"@jitaspace/datatable-common": minor
"@jitaspace/datatable-tanstack": minor
"@jitaspace/datatable-mantine": minor
---

Extend the DataTable contract and drop `mantine-react-table`.

- **`@jitaspace/datatable`**: columns accept `filter` (`text`, `select`,
  `multi-select`, `range`, `boolean`, `date-range`) and `filterAccessor`.
  `isLoading` now means "render a full page of skeleton rows", and rows without a
  sort value sort last in both directions. All of this is documented in the README.
- **`@jitaspace/datatable-common`** (new): the semantics both engines share
  (value reading, sort keys, filter and search matching, facets), plus the Mantine
  toolbar, filter inputs and header filter button. Behaviour now matches across
  engines because it is the same code.
- **`@jitaspace/datatable-tanstack`** / **`@jitaspace/datatable-mantine`**:
  implement column filters (TanStack through its own header popover,
  mantine-datatable through its built-in one), skeleton loading and nulls-last
  sorting on top of `@jitaspace/datatable-common`. Dates now sort
  chronologically in the mantine-datatable engine; before, every date had the
  same empty sort key.
- `mantine-react-table` is removed from the repo, and with it the last peer
  dependency mismatch, so `strictPeerDependencies` is now `true`.
