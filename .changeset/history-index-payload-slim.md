---
"@jitaspace/web": patch
---

The Change History page now loads faster. Its index is rendered on the server from a day-cached read — no per-visit database query and no separate client request — and the payload is much smaller: it no longer includes the full list of every changed entity's ID, only the per-category counts the page displays.
