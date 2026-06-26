---
"@jitaspace/web": patch
---

Fixed the privacy-friendly analytics script failing to load (and triggering Content Security Policy warnings) because the proxied Umami script host redirected to a different origin.
