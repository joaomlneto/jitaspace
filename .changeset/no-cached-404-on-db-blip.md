---
"@jitaspace/web": patch
---

Fixed the Categories, Regions, Agents, Skills and LP Store pages showing "You have found a secret place" instead of their contents. When the database was briefly unavailable, each of these pages quietly turned the failure into a 404 — and because the pages are cached for a day, that 404 was stored and served to everyone for up to 24 hours after the database had recovered. A database problem is now treated as a temporary error rather than a missing page, so the cached copy is left intact and the page comes back as soon as the database does. The Ship Scanner, Dogma Attributes, Dogma Effects and all-LP-offers pages could fail the same way and got the same treatment; Ship Scanner keeps showing a genuine 404 when the ship category really is absent.
