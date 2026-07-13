---
"@jitaspace/hooks": patch
---

Fix `useCorporationAssets`, `useCorporationContacts`, and `useAllianceContacts` silently truncating results to the first ESI page. Each infinite query had a correct `getNextPageParam` but never called `fetchNextPage`, so only the first page (up to 1000 assets / one page of contacts) was ever loaded.

They now eagerly load every page via a shared `useEagerlyFetchAllPages` helper (matching `useCharacterAssets`/`useCharacterContacts`), and the corporation/alliance contact hooks were de-duplicated behind a shared `useEsiContacts` implementation and a shared `esiInfiniteQueryNextPageParam`.
