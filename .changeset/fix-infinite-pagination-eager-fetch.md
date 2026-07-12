---
"@jitaspace/hooks": patch
---

Fix `useCorporationAssets`, `useCorporationContacts`, and `useAllianceContacts` silently truncating results to the first ESI page. Each infinite query had a correct `getNextPageParam` but never called `fetchNextPage`, so only the first page (up to 1000 assets / one page of contacts) was ever loaded. They now eagerly fetch every page via a `hasNextPage`/`fetchNextPage` effect, matching `useCharacterAssets` and `useCharacterContacts`.
