---
"@jitaspace/web": patch
"@jitaspace/esi-client": patch
---

Fixed market item pages becoming sluggish after browsing several items: the ESI rate limiter's bookkeeping grew with every request made in its 15-minute window, until each response froze the page for a fraction of a second or more. Cancelled requests no longer hold rate-limit budget.
