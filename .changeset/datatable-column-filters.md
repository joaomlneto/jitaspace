---
"@jitaspace/datatable": minor
"@jitaspace/datatable-common": minor
"@jitaspace/datatable-tanstack": minor
"@jitaspace/datatable-mantine": minor
---

Extend the DataTable contract and drop `mantine-react-table`.

- **`@jitaspace/datatable`**: columns accept `filter` (`text`, `select`,
  `multi-select`, `range`, `boolean`, `date-range`) and `filterAccessor`.
  `isLoading` now means "render a full page of skeleton rows". Rows without a
  sort value (`null`, `undefined`, `""`, an invalid date) sort last in both
  directions. Sorting is single-column, ascending on the first click, then
  toggling. The page survives a change of `data` identity, and steps back if the
  data shrinks under it. The README documents all of this.
- **`@jitaspace/datatable-common`** (new): the semantics both engines share
  (value reading, sort keys, filter and search matching, facets), plus the Mantine
  toolbar, filter inputs and header filter button.
- **`@jitaspace/datatable-tanstack`** / **`@jitaspace/datatable-mantine`**:
  implement the above on top of `@jitaspace/datatable-common`. Column filters use
  TanStack's own header popover, or mantine-datatable's built-in one.
  - TanStack: sortable headers are keyboard-operable, and the rows-per-page
    choices include the table's own default page size.
  - mantine-datatable: dates now sort chronologically (every date used to have
    the same empty sort key), and its loading skeleton keeps the pagination
    footer.
