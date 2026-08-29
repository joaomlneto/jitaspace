---
"@jitaspace/web": patch
---

Fixed entities whose EVE name is missing showing up as blank text instead of falling back to something readable. On Change History pages an unnamed item rendered as an empty, still-clickable breadcrumb link, and faction breadcrumbs only ever showed a raw id — they now show the faction's name. Dogma attribute pages with no display name rendered a blank heading and page title, and the attribute comparison table sorted those rows into the wrong place.
