---
"@jitaspace/web": patch
---

Fixed a rare case where a page gated on EVE permissions could stay stuck on its loading placeholder instead of showing your content. If the saved session finished loading at exactly the wrong moment during a page load, the check that waits for it never learned it had completed, and the page waited forever. Reloading cleared it; now it resolves on its own.
