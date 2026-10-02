# @jitaspace/datatable-common

What the two [`@jitaspace/datatable`](../datatable) engines share, so they
cannot drift apart:

- **Semantics** (pure, no React) — `values.ts` and `filters.ts`: how a column's
  value, sort key and filter value are read; how sort keys compare (missing
  values last, dates by time, strings naturally); what the global search and
  each column filter type match; the faceted options and numeric bounds a filter
  offers.
- **Mantine controls** — `DataTableToolbar` (search, "Clear filters", the
  Columns menu), `ColumnFilterControl` (the input for a column's filter type)
  and `ColumnFilterButton` (the header button TanStack uses to open it;
  mantine-datatable brings its own).

Engines depend on this package; app code should not import it. Render
`~/components/DataTable` in the web app instead. (`apps/web` still lists it as
a dependency, so `transpilePackages` can resolve it.)

> **Note:** the `date-range` filter uses `@mantine/dates`, so apps must import
> its stylesheet once at the app root:
>
> ```ts
> import "@mantine/dates/styles.css";
> ```
