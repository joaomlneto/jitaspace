# @jitaspace/eve-components

Data-aware ("smart") EVE Online React components for JitaSpace.

## Overview

These components resolve EVE data (entity names, categories, market groups,
alliance info, …) by calling `@jitaspace/hooks` and render it using the
presentational primitives in [`@jitaspace/ui`](../ui). They were split out of
`@jitaspace/ui` so that the UI library can stay free of the ESI / data-client
dependency graph (`@jitaspace/hooks`, `@jitaspace/esi-client`,
`@jitaspace/sde-client`, …).

## Split-component pattern

Each pure rendering twin lives in `@jitaspace/ui` (e.g. `EveEntityNameDisplay`,
`EveEntityAnchorDisplay`), while the data-fetching wrapper that resolves ids and
feeds the twin lives here (e.g. `EveEntityName`, `EveEntityAnchor`). The
ergonomic call-site API is unchanged from when these components lived in
`@jitaspace/ui`:

```tsx
import { CharacterName, EveEntityAvatar, TypeAnchor } from "@jitaspace/eve-components";

<CharacterName characterId={12345678} />
<TypeAnchor typeId={587}>Rifter</TypeAnchor>
<EveEntityAvatar entityId={12345678} />
```

This keeps `<CharacterName characterId={123} />` ergonomics intact while moving
the ESI coupling up one layer.

## Dependencies

- `@jitaspace/ui` — presentational components + display twins
- `@jitaspace/hooks` — ESI / TanStack Query data hooks
- `@jitaspace/sde-client` — SDE lookups (e.g. icon resolution)
- `@jitaspace/eve-icons`, `@jitaspace/utils`
- `@mantine/core` + `@mantine/hooks`
