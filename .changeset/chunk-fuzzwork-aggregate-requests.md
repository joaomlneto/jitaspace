---
"@jitaspace/hooks": patch
---

`useFuzzworkRegionalMarketAggregates` now splits the type IDs across multiple requests (chunks of 500) and merges the results. Fuzzwork serves aggregates via a GET with the type IDs in the query string and returns HTTP 414 (URI Too Long) once the list grows past ~1000 IDs, which previously caused large requests (e.g. the "all LP offers" page) to return no market data at all.
