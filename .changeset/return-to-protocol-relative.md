---
"@jitaspace/web": patch
---

Fixed a redirect after sign-in that could be pointed at another website: return-to addresses that walked back past the site root are now rejected instead of followed.
