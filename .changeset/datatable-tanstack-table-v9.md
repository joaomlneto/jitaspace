---
"@jitaspace/datatable": major
"@jitaspace/datatable-tanstack": patch
---

Move the TanStack engine to TanStack Table v9, whose core never reads the clock unless a `debug*` option is on, so v8's `Date.now()` in development (which Next.js cacheComponents rejected during prerender) is gone without a patch. The DataTable contract now requires rows to be objects (`DataTableProps<TData extends object>`), as v9 does.
