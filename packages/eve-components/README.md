# @jitaspace/eve-components

Data-aware ("smart") EVE Online React components for JitaSpace.

## Overview

These components resolve EVE data (entity names, categories, market groups,
alliance info, …) — mostly by calling `@jitaspace/hooks`, and in `TypeAvatar`'s
case by asking the EVE image server directly over `swr` which image variations a
type publishes — and render it using the presentational primitives in
[`@jitaspace/ui`](../ui). They were split out of
`@jitaspace/ui` so that the UI library can stay free of the ESI / data-client
dependency graph (`@jitaspace/hooks`, `@jitaspace/esi-client`, …).

## Split-component pattern

Each pure rendering twin lives in `@jitaspace/ui` (e.g. `EveEntityNameDisplay`),
while the data-fetching wrapper that resolves ids and feeds the twin lives here
(e.g. `EveEntityName`). The ergonomic call-site API is unchanged from when these
components lived in `@jitaspace/ui`:

```tsx
import { CharacterName, EveEntityAvatar } from "@jitaspace/eve-components";

<CharacterName characterId={12345678} />
<EveEntityAvatar entityId={12345678} />
```

This keeps `<CharacterName characterId={123} />` ergonomics intact while moving
the ESI coupling up one layer.

Nothing here links to a page. Components that know the web app's routes or
render `next/link` — the entity anchors (`TypeAnchor`, `EveEntityAnchor`, …),
breadcrumbs, entity cards and the alliance-history timeline — live in
`apps/web/components`.

## Dependencies

- `@jitaspace/ui` — presentational components + display twins
- `@jitaspace/hooks` — ESI / TanStack Query data hooks
- `@jitaspace/eve-icons`, `@jitaspace/utils`
- `@mantine/core` + `@mantine/hooks`
- `swr` — `TypeAvatar`'s image-variation lookup
