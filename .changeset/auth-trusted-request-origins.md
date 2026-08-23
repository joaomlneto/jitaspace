---
"@jitaspace/web": patch
---

Hardened EVE Online login: the sign-in and callback URLs are now built from a list of hosts the site is known to run on, so a forged proxy header can no longer bounce someone from the login flow to another site.
