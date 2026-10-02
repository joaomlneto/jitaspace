---
"@jitaspace/web": minor
---

The site's sortable data tables now all use the new table engine: the LP Store,
Agents, Contacts, Market orders, Wallet, Active Wars, and the Dogma attribute and
effect lists. They share one look and one set of controls: a search box, a Columns
menu to show or hide columns, and a filter button in the headers of filterable
columns. A "Clear filters" button resets every filter at once.

Filters carried over from the old tables, plus some new ones:

- **LP Store:** corporation, item, and LP, ISK and AK cost ranges.
- **Wallet:** a date range, entry types (matched exactly, so "Brokers Fee" no longer also shows contract broker fees), and a new amount range.
- **Contacts:** contact type, watchlist, a standings range, and a new labels filter.
- **Agents:** type, division, locator and level.
- **Active Wars:** mutual, open for allies, and declared or started dates.
- **Market orders:** order range.

Rows without a value, such as an ISK/LP with no market data, now always sort to
the bottom, whichever direction you sort. While a table loads it shows a page of
placeholder rows rather than an empty table, so the page doesn't jump when the
data arrives.

The data table choice moved from **Settings → Experimental** to **Settings →
General → Data tables**. It now applies to every table, switching between
TanStack (the default) and mantine-datatable. Agents also fixes a "Division"
column that was labelled "Type".
