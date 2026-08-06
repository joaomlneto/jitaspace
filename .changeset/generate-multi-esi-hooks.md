---
"@jitaspace/hooks": minor
---

Generates a `useMultipleXXX` hook for every subject-scoped ESI list endpoint, instead of hand-writing them one at a time. 55 hooks now ship: 27 corporation-scoped, 26 character-scoped and 2 alliance-scoped.

Everything the hooks need is already machine-readable in the OpenAPI spec — `security` gives the scope, `x-required-roles` the accepted corporation roles, the path parameter the subject kind, and a `page` query parameter marks pagination — so there is no hand-maintained mapping table, and regenerating after a spec update picks up new endpoints and changed scopes on its own.

Two categories of authenticated subject-scoped route are deliberately not generated:

- **A second path parameter** (22 routes, e.g. `/characters/{character_id}/contracts/{contract_id}/items`). The extra id identifies one resource _within_ a subject, so "the same query across every subject" does not describe it.
- **A non-array response** (24 routes, e.g. `/characters/{character_id}/location`, `/wallet`, `/attributes`). `defineMultiEsiQuery` returns one flat list tagged by subject, which a single object or scalar cannot contribute to. These need a second primitive returning one entry per subject.

The generator is a Kubb plugin, run by `pnpm kubb:generate` alongside the existing client generation. It lives in this package rather than `@jitaspace/esi-client` because the emitted hooks import `defineMultiEsiQuery` from here, and esi-client cannot depend on this package without a workspace cycle.

`useMultipleCharacterFittings` and `useMultipleCorporationAssets` are no longer hand-written — they are generated, byte-for-byte equivalent, and still covered by the same tests.
