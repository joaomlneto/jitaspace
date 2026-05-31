---
"@jitaspace/hooks": patch
---

Fix `useMarketGroup` leaking the SDE's localized `name` object (keyed by language) when ESI data is unavailable. The merged result now always exposes `name` as a string, preventing "Objects are not valid as a React child" crashes in consumers such as the market-group breadcrumbs and names.
