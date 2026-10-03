---
"@jitaspace/web": minor
---

The site's sortable data tables now all use one table component: the LP Store,
Agents, Contacts, Market orders, Wallet, and the Dogma attribute and
effect lists. They share one look and one set of controls: a search box, a Columns
menu to show or hide columns, and a filter button in the header of each filterable
column. A "Clear filters" button resets every filter at once.

Filters by table:

- **LP Store:** corporation, item, and LP, ISK and AK cost ranges.
- **Wallet:** a date range, entry types, and a new amount range.
- **Contacts:** contact type, watchlist, a standings range, and a new labels filter.
- **Agents:** type, division, locator and level.
- **Market orders:** order range.
- **Dogma attributes and effects:** the number of types.

The old tables also had a free-text filter under every column. Those are gone:
the search box above each table covers them, and it now searches lists too, so
typing a label finds the contacts that carry it.

Sorting works the same everywhere: the first click on a header sorts ascending,
the next one descending, and rows without a value (such as an ISK/LP with no
market data) always stay at the bottom. Sortable headers can now be sorted from
the keyboard as well. A table stays on the page you are reading when its data
refreshes. The Market and Wallet tables show a page of placeholder rows while
they load, so the page doesn't jump when the data arrives.

The data table choice moved from **Settings → Experimental** to **Settings →
General → Data tables**. It now applies to every table, switching between
TanStack (the default) and mantine-datatable. The Agents table's "Division"
column, which was labelled "Type", now has its proper name.
