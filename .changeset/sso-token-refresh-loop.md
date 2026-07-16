---
"@jitaspace/web": patch
---

Fixed the app repeatedly retrying sign-in for characters whose EVE session had expired (one failed request per second while any tab was open), and stopped it from giving up on refreshing tokens after a temporary network error — refreshing now resumes automatically instead of leaving you signed out until a page reload.
