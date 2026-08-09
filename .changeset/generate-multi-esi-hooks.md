---
"@jitaspace/hooks": minor
---

Generates a `useMultipleXXX` hook for every subject-scoped ESI endpoint, instead of hand-writing them one at a time. 76 hooks now ship, covering every authenticated route that a subject fan-out can express.

Everything the hooks need is already machine-readable in the OpenAPI spec — `security` gives the scope, `x-required-roles` the accepted corporation roles, the path parameter the subject kind, and a `page` query parameter marks pagination — so there is no hand-maintained mapping table, and regenerating after a spec update picks up new endpoints and changed scopes on its own.

Endpoints answering with a list of objects (53) use `defineMultiEsiQuery` and return one flat tagged list. The rest (23) use the new `defineMultiEsiValueQuery`, which returns one `{ subjectId, data }` entry per subject: a single object or scalar (a character's location, wallet balance, attributes) has nothing to flatten, and an array of scalars — implants, corporation members — cannot carry a per-item tag, since tagging spreads each item and spreading a number leaves only the tag behind.

Both primitives share `useEsiSubjectQueries`, so they cannot drift on subject resolution, per-subject error attribution, `refetch`, or the rehydration-aware `isPending`; only the shape of `data` differs.

Two categories of authenticated subject-scoped route are still not generated:

- **A second path parameter** (22 routes, e.g. `/characters/{character_id}/contracts/{contract_id}/items`). The extra id identifies one resource _within_ a subject, so "the same query across every subject" does not describe it.
- **A required query parameter** (1 route, `/characters/{character_id}/search`). It is an argument the caller has to supply, and a fan-out has nowhere to take one from — searching across every character still needs the search term.
- **Cursor pagination** (2 routes, corporation projects and freelance jobs). They page with `after`/`before`/`limit` rather than `page` + `x-pages`, so they would have returned only the server's first page under a name promising every subject's whole collection.

The generator is a Kubb plugin, run by `pnpm kubb:generate` alongside the existing client generation. It lives in this package rather than `@jitaspace/esi-client` because the emitted hooks import `defineMultiEsiQuery` from here, and esi-client cannot depend on this package without a workspace cycle.

`useMultipleCharacterFittings` and `useMultipleCorporationAssets` are no longer hand-written — they are generated, byte-for-byte equivalent, and still covered by the same tests.

Paginated fan-outs refuse rather than truncate: a subject reporting more than 100 pages throws instead of returning the first 100, since a partial collection that looks complete is the same failure the cursor-paginated routes are skipped for. Errors are attributed per subject, so the failure names the corporation it belongs to and the other subjects still return their data.
