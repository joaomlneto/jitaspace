---
"@jitaspace/web": minor
---

Add an experimental DataTable engine switcher. A new **Settings → Experimental** tab toggles "New data tables" (off by default).

While **off**, every table renders exactly as before — the LP Store table keeps its original `mantine-react-table` implementation (per-column filters, cost range sliders, faceted values) and all other tables are untouched.

While **on**, the LP Store table renders the engine-agnostic implementations and shows a per-table selector to switch between Classic (`mantine-react-table`), TanStack, and `mantine-datatable`.
