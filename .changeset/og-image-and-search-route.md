---
"@jitaspace/web": patch
---

Fixed item pages sharing a broken preview image on Discord, Twitter and other sites that unfurl links. Items with no artwork in EVE's image service were advertising an image address that does not exist; they now share no image instead, so the link falls back to the title and description.

Fixed searching for a solar system and clicking the result leading to a "page not found" error.
