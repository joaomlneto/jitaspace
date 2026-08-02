---
"@jitaspace/web": patch
---

Ship pages that use static EVE data (item types, solar systems, characters, the change history) faster and more reliably: that data now comes from JitaSpace's own database instead of a separate SDE service, and is baked into each page rather than fetched piece by piece after the page loads. The server-status page now reports when JitaSpace's SDE data was last updated, compared against CCP's latest release.
