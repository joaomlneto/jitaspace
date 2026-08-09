---
"@jitaspace/hooks": patch
---

Infinite queries now key their cache entries explicitly, so they cannot collide with the single-page query for the same endpoint.

Kubb generates the two key functions identically — `getCorporationsCorporationIdAssetsQueryKey` and `...InfiniteQueryKey` both produce `[{ url, params }]` plus any query params — so the infinite call sites only avoided colliding because each happened to pass `{}` as `params`, which appends a trailing `{}`. That is an accident rather than a design: dropping the `{}`, a reasonable-looking cleanup since none of those call sites want query params, would have made the keys identical. One entry holds `InfiniteData` and the other a flat `ResponseConfig`, so whichever query mounted first would win and the other would read the wrong shape — `data?.pages.flat()` throws, because the optional chain guards `data` and not `pages`.

All seven infinite call sites now append an explicit marker via `esiInfiniteQueryKey`, and a test asserts against the real generated key functions that the marked keys never equal the single-page ones.

This also fixes a live instance: `useCharacterMails` built its key from `getCharactersCharacterIdMailQueryKey` — the _single-page_ function — and handed it to an infinite query, so its `InfiniteData` was stored under the flat endpoint's key. It now uses the infinite key function, keeping the label dimension it already had.
