---
"@jitaspace/web": patch
"@jitaspace/esi-client": patch
---

Pages download less JavaScript: the ESI client no longer ships its unused response schemas with every page. Requests for things that don't exist, and requests made while ESI is rejecting us for too many errors, are no longer retried three times.
