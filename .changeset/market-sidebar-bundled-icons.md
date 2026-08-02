---
"@jitaspace/db": minor
"@jitaspace/background-jobs": minor
"@jitaspace/ui": minor
"@jitaspace/eve-components": patch
---

Serve market group icons from the database instead of the client.

- **`@jitaspace/db`** — `MarketGroup` gains an optional `iconId` foreign key to `Icon` (plus an index). ESI's market group endpoint has no icon, so the column is owned by the SDE ingest.
- **`@jitaspace/background-jobs`** — `ingestSdeMarketGroups` populates `iconId` from `marketGroups.yaml`, dropping ids missing from `icons.yaml` the same way `ingestSdeTypes` does. `scrapeEsiMarketGroups` now excludes `iconId` from its local-vs-remote diff so it doesn't rewrite every row on each run.
- **`@jitaspace/ui`** — new `EveIconAvatarDisplay` (and the `eveIconFileUrl` helper): the presentational half of `EveIconAvatar`, for callers that already have the icon's `iconFile` and shouldn't pay for a lookup.
- **`@jitaspace/eve-components`** — `EveIconAvatar` renders through `EveIconAvatarDisplay` rather than duplicating the URL and placeholder handling.

Requires a schema push and a re-run of `ingest-sde-market-groups`; until that job runs the new column is null and icons fall back to the placeholder.
