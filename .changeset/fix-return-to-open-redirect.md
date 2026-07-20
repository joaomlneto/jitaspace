---
"@jitaspace/web": patch
---

Hardened the post-login redirect so it can only ever return you to a page on jita.space. Previously a crafted link could slip a backslash past the safety check and bounce you to an external site after signing in; the redirect target is now validated to be same-origin.
