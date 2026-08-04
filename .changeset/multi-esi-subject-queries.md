---
"@jitaspace/hooks": minor
---

Added `useEsiSubjects` and `defineMultiEsiQuery` for fanning a single ESI query across every character, corporation or alliance the logged-in characters can reach.

`useEsiSubjects({ kind, scopes, roles })` enumerates the reachable subjects of one kind and pairs each with a token that authorises it. Corporation- and alliance-scoped routes are still authenticated with a character token, so this is the piece that differs per kind; corporations and alliances are deduplicated, since any member's token authorises the request equally well.

`defineMultiEsiQuery({ kind, scopes, roles, query })` turns a generated `*QueryOptions(...)` into a hook that queries every subject and returns one flat list, each item tagged with its `subjectId`. The generated options are reused verbatim, so the query keys match the equivalent single-subject hooks and both share a cache entry.

`esiPagedQueryOptions` covers the 31 of 111 subject-scoped ESI routes that paginate. `useQueries` cannot run infinite queries, so those routes cannot reuse the `*Infinite` variants — but every existing consumer already pages through the whole collection immediately, so this fetches the first page to learn the count and then requests the rest concurrently, presenting the result as an ordinary single response. React Query's abort signal is threaded into every page, so an unmount or refetch cancels the whole fan-out.

Two hooks are built on it: `useMultipleCharacterFittings` (simple, character-scoped) and `useMultipleCorporationAssets` (paginated, corporation-scoped).

`roles` is accepted but not yet enforced, matching `useAccessToken` — `corporationRoles` is still never populated.
