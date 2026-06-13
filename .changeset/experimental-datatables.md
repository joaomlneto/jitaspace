---
"@jitaspace/web": minor
---

Add an experimental DataTable engine switcher. A new **Settings → Experimental** tab toggles "New data tables". When off, tables render with the classic `mantine-react-table` (unchanged behaviour). When on, the app-level `DataTable` renders the engine-agnostic implementations and shows a per-table selector to switch between Classic (`mantine-react-table`), TanStack, and `mantine-datatable`. The LP Store table is the first to use it.
