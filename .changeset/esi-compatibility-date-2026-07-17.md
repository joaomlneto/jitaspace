---
"@jitaspace/esi-metadata": minor
---

chore(esi-client): bump the ESI compatibility date from `2025-12-16` to `2026-07-17`

Regenerates `endpointScopes` from the newly downloaded spec. The scope list itself is unchanged (ESI advertises every scope regardless of compatibility date), but the endpoint map picks up the routes added between the two dates:

- **Sovereignty rework (`2026-05-19`)**: `/sovereignty/map` and `/sovereignty/structures` are gone, unified into `/sovereignty/systems`.
- **New routes**: character access-lists, mercenary tactical operations and mercenary dens, corporation skyhooks and sovereignty hubs, `/skyhooks/raidable`, and `/meta/name`.

Consumer-visible changes in `@jitaspace/esi-client` (private, so not versioned here):

- `GetCharactersCharacterId` was renamed to `GetCharactersDetail` upstream, renaming every generated symbol for `GET /characters/{character_id}` (`getCharactersDetail`, `useGetCharactersDetail`, `GetCharactersDetailQueryResponse`, …).
- `CharactersDetail.title` was renamed to `corporation_title`, and gained the required `achievement_score` plus an optional `character_title_id`.

The compatibility date is now stored in one place: `download-schema` pins it in the request URL, and `buildscript.js` reads it back out of the downloaded spec's `info.version` instead of keeping a second hardcoded copy that could drift.
