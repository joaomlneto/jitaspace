---
"@jitaspace/web": patch
---

Fixed the breadcrumbs on the "#System" item group and category pages, which stayed as loading placeholders forever. Those pages, and anything in them, now also show their real title in search results and link previews instead of the generic site one.

LP store pages now show the same title and link preview whether you open them by corporation name (as the LP store list links them) or by number. Search engines are pointed at the name-based address, which is now the one listed in the sitemap, so each store appears once in search rather than twice.
