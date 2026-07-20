---
"@jitaspace/web": patch
---

Return the user to the page they were on after EVE Online SSO login, instead of always redirecting to the homepage. `loginWithEveOnline()` now defaults `returnTo` to the current location when a caller doesn't supply one; the existing same-site `sanitizeReturnTo` guard still applies.
