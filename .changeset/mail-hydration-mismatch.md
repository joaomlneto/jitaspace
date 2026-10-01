---
"@jitaspace/web": patch
"@jitaspace/hooks": patch
---

Fixed an error on every load of Mail (and other pages that need extra EVE permissions) that made the browser throw away the server-rendered page and redraw it from scratch.
