---
"@jitaspace/hooks": minor
---

Added `useEsiSubjects` and `defineMultiEsiQuery` for fanning a single ESI query across every character, corporation or alliance the logged-in characters can reach.

`useEsiSubjects({ kind, scopes, roles })` enumerates the reachable subjects of one kind and pairs each with a token that authorises it. Corporation- and alliance-scoped routes are still authenticated with a character token, so this is the piece that differs per kind; corporations and alliances are deduplicated, since any member's token authorises the request equally well. Characters with an expired session, and a `corporationId` of `0` left behind by a failed affiliation lookup, are excluded — neither can authorise a request, and `0` is not a real corporation.

`defineMultiEsiQuery({ kind, scopes, roles, query })` turns a generated `*QueryOptions(...)` into a hook that queries every subject and returns one flat list, each item tagged with its `subjectId`, alongside `refetch`, per-subject `errors`, and an `isPending` that stays true until the persisted auth store has rehydrated. The generated options are reused verbatim, so non-paginated query keys match the equivalent single-subject hooks and both share a cache entry.

`esiPagedQueryOptions` covers the 31 of 111 subject-scoped ESI routes that paginate. `useQueries` cannot run infinite queries, so those routes cannot reuse the `*Infinite` variants — but every existing consumer already pages through the whole collection immediately, so this fetches the first page to learn the count and then requests the rest through a small concurrency pool, presenting the result as an ordinary single response. React Query's abort signal is threaded into every page, so an unmount or refetch cancels the whole fan-out. Its query key deliberately extends the generated one: "every page" and "page 1" share a response shape but are different resources, and sharing a cache entry would serve one as the other.

Two hooks are built on it: `useMultipleCharacterFittings` (simple, character-scoped) and `useMultipleCorporationAssets` (paginated, corporation-scoped).

Also exports `useAuthStoreHasHydrated`, and fixes `useAccessToken` picking a character whose session has expired over a live one that matches equally well.

`roles` is enforced as a hard any-of filter, through a `characterHasAcceptedRole` helper now shared with `useAccessToken` so the two cannot drift. This matters more under a fan-out than for a single request: all role-gated ESI GET routes are corporation-scoped, so a wrong guess is one 403 per corporation on each of them, against an API that rate-limits on error rate.
