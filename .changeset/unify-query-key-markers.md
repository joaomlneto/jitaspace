---
"@jitaspace/hooks": patch
---

Collapsed the two query-key marker mechanisms into one module. `ALL_PAGES_QUERY_KEY_MARKER` and `INFINITE_QUERY_KEY_MARKER` solved the same problem — keeping a query's cache entry separate from the generated single-page one — in two places with different visibility, one public through the `multi` barrel and one internal to `utils`. They are now `ESI_QUERY_KEY_MARKER.infinite` and `ESI_QUERY_KEY_MARKER.allPages`, appended by a shared `markEsiQueryKey`, with the reason the three entries are distinct documented in one place.

No behaviour change: the marker values are unchanged, so cache keys are identical.
