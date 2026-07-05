---
"@jitaspace/hooks": patch
---

Fix `useRace` and `useBloodline` returning a stale result when the requested id changes after the reference dataset has already loaded. The lookup `useMemo` omitted the id from its dependency array, so a component that mounted with an unresolved id (e.g. `0`) and received the real id afterwards would keep resolving to `undefined`.
