---
"@jitaspace/db": minor
"@jitaspace/background-jobs": minor
"@jitaspace/ui": minor
"@jitaspace/eve-components": major
---

Serve market group icons from the database, and address icon images by id.

- **`@jitaspace/db`** — `MarketGroup` gains an optional `iconId` foreign key to `Icon` (plus an index). ESI's market group endpoint has no icon, so the column is owned by the SDE ingest.
- **`@jitaspace/background-jobs`** — `ingestSdeMarketGroups` populates `iconId` from `marketGroups.yaml`, dropping ids missing from `icons.yaml` the same way `ingestSdeTypes` does. `scrapeEsiMarketGroups` now excludes `iconId` from its local-vs-remote diff so it doesn't rewrite every row on each run.
- **`@jitaspace/ui`** — `EveIconAvatar` now lives here. It builds its URL from the icon id (`icons.jita.space/icons/{iconId}`, served by `@jitaspace/icon-server`) instead of looking the icon file up in the SDE, so it issues no requests. `eveIconUrl` is exported alongside it, and `EveIconAvatarPlaceholder` uses icon id 0 — the server's own unknown-icon image.
- **`@jitaspace/eve-components`** — **breaking**: `EveIconAvatar` moved to `@jitaspace/ui`; it no longer fetches, so it no longer belongs in the data-aware package. Import it from `@jitaspace/ui`. `MarketGroupAvatar` is unchanged for callers.

Requires a schema push and a re-run of `ingest-sde-market-groups`; until that job runs the new column is null and market group icons fall back to the placeholder.
