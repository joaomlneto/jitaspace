---
"@jitaspace/hooks": minor
---

Generates a `useMultipleXXX` hook for every subject-scoped ESI endpoint, instead of hand-writing them one at a time. 78 hooks now ship, covering every authenticated route that a subject fan-out can express.

Everything the hooks need is already machine-readable in the OpenAPI spec — `security` gives the scope, `x-required-roles` the accepted corporation roles, the path parameter the subject kind, and a `page` query parameter marks pagination — so there is no hand-maintained mapping table, and regenerating after a spec update picks up new endpoints and changed scopes on its own.

Endpoints answering with a list (55) use `defineMultiEsiQuery` and return one flat tagged list. Endpoints answering with a single object or scalar (23) — a character's location, wallet balance, or attributes — use the new `defineMultiEsiValueQuery`, which returns one `{ subjectId, data }` entry per subject instead. There is nothing to flatten and no per-item tag to attach, so the list model does not fit them.

Both primitives share `useEsiSubjectQueries`, so they cannot drift on subject resolution, per-subject error attribution, `refetch`, or the rehydration-aware `isPending`; only the shape of `data` differs.

Two categories of authenticated subject-scoped route are still not generated:

- **A second path parameter** (22 routes, e.g. `/characters/{character_id}/contracts/{contract_id}/items`). The extra id identifies one resource _within_ a subject, so "the same query across every subject" does not describe it.
- **A required query parameter** (1 route, `/characters/{character_id}/search`). It is an argument the caller has to supply, and a fan-out has nowhere to take one from — searching across every character still needs the search term.

The generator is a Kubb plugin, run by `pnpm kubb:generate` alongside the existing client generation. It lives in this package rather than `@jitaspace/esi-client` because the emitted hooks import `defineMultiEsiQuery` from here, and esi-client cannot depend on this package without a workspace cycle.

`useMultipleCharacterFittings` and `useMultipleCorporationAssets` are no longer hand-written — they are generated, byte-for-byte equivalent, and still covered by the same tests.
