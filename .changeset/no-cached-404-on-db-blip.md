---
"@jitaspace/web": patch
---

Fixed the Categories, Regions, Agents, Skills and LP Store pages showing "You have found a secret place" instead of their contents. When the database was briefly unavailable, each of these pages quietly turned the failure into a 404 — and because the pages are cached for a day, that 404 was stored and served to everyone for up to 24 hours after the database had recovered. The pages now ride out a database blip by continuing to serve the last good copy, and the same fix has been applied to the Ship Scanner, Dogma Attributes, Dogma Effects and all-LP-offers pages, which could fail the same way.
