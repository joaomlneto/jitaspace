---
"@jitaspace/web": patch
"@jitaspace/hooks": patch
---

Fixed the calendar's "Load more events" button re-listing events it had already shown. Paging walked the calendar backwards by a single event per request, so each new page repeated 49 of the 50 events above it and reaching the end of a busy calendar took roughly 150 clicks instead of four.
