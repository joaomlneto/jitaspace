---
"@jitaspace/web": minor
"@jitaspace/hooks": patch
"@jitaspace/ui": patch
"@jitaspace/esi-client": patch
---

Re-enable and fix the main Spotlight search

**`@jitaspace/hooks`**
- Add `useEsiNameLookup` compound hook (combines `useEsiNamePrefetch` + `useEsiNames`) for reactive name resolution
- Fix `useEsiNames` reactivity bug: the shared `checkForUpdates` callback compared `CacheState.id` (an internal auto-increment `number`) against the entity ID list, so updates never triggered re-renders; replaced with per-key callbacks that each close over their own string key

**`@jitaspace/esi-client`**
- Fix SSR hydration mismatch in `useEsiRateLimit`: moved initial state load from lazy `useState` initializer into `useEffect` so the server and client start with the same empty state

**`@jitaspace/ui`**
- Replace `useEsiNamesCache` (static snapshot) with `useEsiNameLookup` (reactive) in `AssetLocationSelect`, `EsiSearchSelect`, and `EveEntitySelect`
- Fix `EveEntitySelect.displayName` (was incorrectly set to `"EsiSearchSelect"`)

**`@jitaspace/web`**
- Re-enable the Spotlight search component (disabled since the Mantine v6 → v7 migration)
- Rewrite `MainSpotlight` using the Mantine compound Spotlight API (`Spotlight.Root` / `Spotlight.Search` / `Spotlight.ActionsList`) to keep `SpotlightActionsList` always mounted, preventing a Mantine bug where pressing Enter with no results threw `SyntaxError: '# [data-selected]' is not a valid selector`
- Show apps from all categories (Character, Corporation, Alliance, Universe, Developer) in grouped sections
- Make the results list scrollable (removed 100-result cap)
- Replace `useEsiNamesCache` with `useEsiNameLookup` in `AssetsDataTable`, character assets page, and corporation assets page
- Add tests for `MainSpotlight` covering app rendering, query filtering, navigation, and ESI search result handling
