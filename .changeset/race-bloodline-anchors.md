---
"@jitaspace/ui": minor
"@jitaspace/eve-components": patch
---

Added `RaceAnchor` and `BloodlineAnchor`. Races and bloodlines are SDE reference data rather than ESI-resolvable entities, so they cannot route through `EveEntityAnchor`; both build the href from the id directly, with no name lookup.

`CorporationAnchor` now accepts an optional `corporationId`, matching `TypeAnchor`, `CharacterAnchor` and `FactionAnchor`. All three new/changed components render their children unlinked while the id is nullish, so a call site can no longer emit `/corporation/undefined` for `next/link` to prefetch. `CorporationAnchor` also drops the trailing slash from its href, so it stops splitting the CDN cache between `/corporation/123` and `/corporation/123/`.

`EveEntityAnchor` now prefers the `category` prop over the category reported by `useEsiName`. That value is read off the resolved cache entry, so it stayed undefined until the name lookup landed and every typed anchor rendered `href="#"` in the meantime — even though the destination follows from the id alone.
